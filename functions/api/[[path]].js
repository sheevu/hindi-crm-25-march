import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const app = new Hono().basePath("/api");

app.use("*", async (c, next) => {
  const originEnv = c.env?.CORS_ORIGIN || "*";
  const origins = originEnv === "*"
    ? "*"
    : originEnv.split(",").map((o) => o.trim()).filter(Boolean);
  return cors({
    origin: origins,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    maxAge: 86400,
  })(c, next);
});

function isBlank(value) {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatInr(n) {
  return "₹" + toNumber(n, 0).toLocaleString("en-IN");
}

function requireOrgId(value, c) {
  if (isBlank(value)) {
    c.status(400);
    return c.json({ error: "org_id required" });
  }
  return null;
}

function requirePositiveNumber(value, field, c) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    c.status(400);
    return c.json({ error: `${field} must be a number > 0` });
  }
  return null;
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .map((h) => ({
      role: h.role,
      content: typeof h.content === "string" ? h.content : h.text,
    }))
    .filter((m) => m.role && m.content);
}

function normalizeInvoiceItems(items) {
  if (!Array.isArray(items)) return { items: [], error: null };
  for (const item of items) {
    if (isBlank(item?.description)) {
      return { items: [], error: "Each item requires description" };
    }
  }
  const normalized = items.map((item) => {
    const quantity = toNumber(item.quantity, 1);
    const unitPrice = toNumber(item.unit_price, 0);
    const discountPct = toNumber(item.discount_pct, 0);
    const lineTotal = toNumber(
      item.line_total,
      quantity * unitPrice * (1 - discountPct / 100)
    );
    return {
      description: item.description,
      quantity,
      unit_price: unitPrice,
      discount_pct: discountPct,
      line_total: lineTotal,
      product_id: item.product_id,
      hsn_sac: item.hsn_sac,
      gst_rate: toNumber(item.gst_rate, 18),
    };
  });
  return { items: normalized, error: null };
}

function createSupabase(env) {
  const missing = [];
  if (!env?.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!env?.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) return { client: null, missing };
  return {
    client: createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
    missing: [],
  };
}

function createOpenAI(env) {
  if (!env?.OPENAI_API_KEY) {
    return { client: null, missing: ["OPENAI_API_KEY"] };
  }
  return { client: new OpenAI({ apiKey: env.OPENAI_API_KEY }), missing: [] };
}

async function parseJson(c) {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

async function fetchInsightsData(supabase, org_id) {
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const [invRes, custRes, expRes, taskRes] = await Promise.all([
    supabase.from("invoices").select("status, total_amount, paid_amount, due_date").eq("org_id", org_id),
    supabase.from("customers").select("customer_id, is_active").eq("org_id", org_id),
    supabase.from("expenses").select("amount, category").eq("org_id", org_id).gte("date", firstOfMonth),
    supabase.from("tasks").select("status, due_date").eq("org_id", org_id).eq("status", "Pending"),
  ]);

  const errors = [invRes.error, custRes.error, expRes.error, taskRes.error].filter(Boolean);
  if (errors.length) throw new Error(errors.map((e) => e.message).join(" | "));

  const invoices = invRes.data || [];
  const totalDue = invoices
    .filter((i) => i.status !== "Paid")
    .reduce((s, i) => s + (toNumber(i.total_amount) - toNumber(i.paid_amount)), 0);
  const overdue = invoices.filter((i) => i.status === "Overdue").length;
  const totalExp = (expRes.data || []).reduce((s, e) => s + toNumber(e.amount), 0);

  return {
    total_pending_amount: totalDue,
    overdue_invoices: overdue,
    active_customers: (custRes.data || []).filter((c) => c.is_active).length,
    pending_tasks: (taskRes.data || []).length,
    this_month_expenses: totalExp,
  };
}

async function createInvoice(supabase, { org_id, customer_id, items, notes, due_date, tax_rate, tax_mode, discount_amt }) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const subtotal = normalizedItems.reduce((s, i) => s + toNumber(i.line_total), 0);
  const discountAmt = Math.max(toNumber(discount_amt, 0), 0);
  const taxableBase = Math.max(subtotal - discountAmt, 0);
  const taxRate = Number.isFinite(Number(tax_rate)) ? Number(tax_rate) : 18;
  const taxMode = tax_mode === "igst" ? "igst" : "cgst_sgst";
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (taxRate > 0) {
    if (taxMode === "igst") {
      igst = taxableBase * (taxRate / 100);
    } else {
      cgst = taxableBase * (taxRate / 200);
      sgst = taxableBase * (taxRate / 200);
    }
  }
  const total = taxableBase + cgst + sgst + igst;

  const invNum = "INV-" + Date.now().toString().slice(-5);

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .insert([{
      org_id,
      customer_id,
      invoice_number: invNum,
      subtotal,
      discount_amt: discountAmt,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      total_amount: total,
      notes,
      due_date,
    }])
    .select()
    .single();

  if (invErr) throw invErr;

  if (normalizedItems.length > 0) {
    const { error: itemsErr } = await supabase
      .from("invoice_items")
      .insert(normalizedItems.map((i) => ({ ...i, invoice_id: inv.invoice_id })));
    if (itemsErr) throw itemsErr;
  }

  return { invoice: inv, total };
}

async function createPayment(supabase, { org_id, invoice_id, amount, payment_mode, reference_no }) {
  const { data, error } = await supabase
    .from("payments")
    .insert([{ org_id, invoice_id, amount, payment_mode: payment_mode || "UPI", reference_no }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function executeAction({ supabase, org_id, action, parameters }) {
  let dbResult = null;

  switch (action) {
    case "GET_BALANCE": {
      const name = parameters?.customer_name;
      if (isBlank(name)) throw new Error("customer_name required");
      const { data, error } = await supabase
        .from("invoices")
        .select("total_amount, paid_amount, customers(business_name)")
        .eq("org_id", org_id)
        .neq("status", "Paid")
        .ilike("customers.business_name", `%${name}%`);
      if (error) throw error;
      const balance = (data || []).reduce((s, i) => s + (toNumber(i.total_amount) - toNumber(i.paid_amount)), 0);
      dbResult = { balance, customer: name };
      break;
    }
    case "ADD_CUSTOMER": {
      if (isBlank(parameters?.business_name)) throw new Error("business_name required");
      const { data, error } = await supabase
        .from("customers")
        .insert([{ org_id, ...parameters }])
        .select()
        .single();
      if (error) throw error;
      dbResult = data;
      break;
    }
    case "CREATE_TASK": {
      if (isBlank(parameters?.title)) throw new Error("title required");
      const { data, error } = await supabase
        .from("tasks")
        .insert([{
          org_id,
          title: parameters.title,
          customer_id: parameters.customer_id,
          due_date: parameters.due_date,
          priority: parameters.priority || "Medium",
        }])
        .select()
        .single();
      if (error) throw error;
      dbResult = data;
      break;
    }
    case "QUERY_TASKS": {
      const status = parameters?.status || "Pending";
      const { data, error } = await supabase
        .from("tasks")
        .select("*, customers(business_name)")
        .eq("org_id", org_id)
        .eq("status", status);
      if (error) throw error;
      dbResult = data;
      break;
    }
    case "CREATE_INVOICE": {
      if (isBlank(parameters?.customer_id)) throw new Error("customer_id required");
      const { items: normalizedItems, error: itemsError } = normalizeInvoiceItems(parameters?.items || []);
      if (itemsError) throw new Error(itemsError);
      const { invoice, total } = await createInvoice(supabase, {
        org_id,
        customer_id: parameters.customer_id,
        items: normalizedItems,
        notes: parameters.notes,
        due_date: parameters.due_date,
        tax_rate: parameters.tax_rate,
        tax_mode: parameters.tax_mode,
        discount_amt: parameters.discount_amt,
      });
      dbResult = { invoice, total };
      break;
    }
    case "ADD_PAYMENT": {
      if (isBlank(parameters?.invoice_id)) throw new Error("invoice_id required");
      const amt = Number(parameters?.amount);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("amount must be a number > 0");
      const payment = await createPayment(supabase, {
        org_id,
        invoice_id: parameters.invoice_id,
        amount: amt,
        payment_mode: parameters.payment_mode,
        reference_no: parameters.reference_no,
      });
      dbResult = payment;
      break;
    }
    case "QUERY_INVOICES": {
      let query = supabase
        .from("invoices")
        .select("*, customers(business_name, phone)")
        .eq("org_id", org_id);
      if (parameters?.status) query = query.eq("status", parameters.status);
      if (parameters?.customer_id) query = query.eq("customer_id", parameters.customer_id);
      if (parameters?.overdue_only) query = query.eq("status", "Overdue");
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      dbResult = data;
      break;
    }
    case "GET_INSIGHTS": {
      dbResult = await fetchInsightsData(supabase, org_id);
      break;
    }
    default:
      dbResult = null;
  }

  return dbResult;
}

app.get("/", (c) => {
  return c.json({ status: "ok", app: "Vyapai CRM API", version: "2.0" });
});

app.post("/chat-crm", async (c) => {
  const body = await parseJson(c);
  if (!body) return c.json({ error: "invalid JSON" }, 400);
  const { message, history = [], org_id } = body;
  if (isBlank(message)) return c.json({ error: "message required" }, 400);

  const { client: openai, missing } = createOpenAI(c.env);
  if (!openai) return c.json({ error: "OpenAI not configured", missing_env: missing }, 500);

  let context = "";
  if (org_id) {
    const { client: supabase, missing: supaMissing } = createSupabase(c.env);
    if (!supabase) return c.json({ error: "Supabase not configured", missing_env: supaMissing }, 500);
    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .select("total_amount, paid_amount, status")
      .eq("org_id", org_id)
      .neq("status", "Paid");
    if (invErr) return c.json({ error: invErr.message }, 500);
    const totalDue = inv?.reduce((s, i) => s + (toNumber(i.total_amount) - toNumber(i.paid_amount)), 0) || 0;
    context = `\nLive context: Total pending = ₹${totalDue.toLocaleString("en-IN")}`;
  }

  const messages = [
    ...normalizeHistory(history),
    { role: "user", content: message + context },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: c.env?.OPENAI_MODEL || "gpt-4o",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 600,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;
    return c.json({ reply, tokens: completion.usage?.total_tokens });
  } catch (err) {
    return c.json({ error: "AI error", detail: err.message }, 500);
  }
});

app.post("/voice-agent", async (c) => {
  const body = await parseJson(c);
  if (!body) return c.json({ error: "invalid JSON" }, 400);
  const { transcript, org_id } = body;
  if (isBlank(transcript)) return c.json({ error: "transcript required" }, 400);

  const { client: openai, missing } = createOpenAI(c.env);
  if (!openai) return c.json({ error: "OpenAI not configured", missing_env: missing }, 500);

  try {
    const completion = await openai.chat.completions.create({
      model: c.env?.OPENAI_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Voice input: "${transcript}"\nOrg: ${org_id || "default"}` },
      ],
      max_tokens: 400,
      temperature: 0.5,
    });

    const raw = completion.choices[0].message.content;
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    if (parsed?.action) {
      if (isBlank(org_id)) return c.json({ error: "org_id required" }, 400);
      const { client: supabase, missing: supaMissing } = createSupabase(c.env);
      if (!supabase) return c.json({ error: "Supabase not configured", missing_env: supaMissing }, 500);
      try {
        const dbResult = await executeAction({
          supabase,
          org_id,
          action: parsed.action,
          parameters: parsed.parameters,
        });
        return c.json({ reply: parsed.reply || raw, action: parsed.action, dbResult });
      } catch (err) {
        return c.json({ error: err.message, action: parsed.action }, 500);
      }
    }

    return c.json({ reply: raw, action: null });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post("/insights", async (c) => {
  const body = await parseJson(c);
  if (!body) return c.json({ error: "invalid JSON" }, 400);
  const { org_id } = body;
  const orgError = requireOrgId(org_id, c);
  if (orgError) return orgError;

  const { client: supabase, missing: supaMissing } = createSupabase(c.env);
  if (!supabase) return c.json({ error: "Supabase not configured", missing_env: supaMissing }, 500);

  const { client: openai, missing } = createOpenAI(c.env);
  if (!openai) return c.json({ error: "OpenAI not configured", missing_env: missing }, 500);

  try {
    const dataContext = JSON.stringify(await fetchInsightsData(supabase, org_id));
    const prompt = INSIGHTS_PROMPT.replace("{DATA}", dataContext);

    const completion = await openai.chat.completions.create({
      model: c.env?.OPENAI_MODEL || "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1200,
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post("/customers", async (c) => {
  const body = await parseJson(c);
  if (!body) return c.json({ error: "invalid JSON" }, 400);
  const { org_id, business_name, owner_name, phone, city, category, gstin } = body;

  const orgError = requireOrgId(org_id, c);
  if (orgError) return orgError;
  if (isBlank(business_name)) return c.json({ error: "business_name required" }, 400);

  const { client: supabase, missing: supaMissing } = createSupabase(c.env);
  if (!supabase) return c.json({ error: "Supabase not configured", missing_env: supaMissing }, 500);

  try {
    const { data, error } = await supabase
      .from("customers")
      .insert([{ org_id, business_name, owner_name, phone, city, category: category || "Kirana", gstin }])
      .select()
      .single();

    if (error) throw error;
    return c.json({ success: true, customer: data, message: `${business_name} ko CRM mein jod diya gaya ji! ✅` });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get("/customers", async (c) => {
  const org_id = c.req.query("org_id");
  const orgError = requireOrgId(org_id, c);
  if (orgError) return orgError;

  const { client: supabase, missing: supaMissing } = createSupabase(c.env);
  if (!supabase) return c.json({ error: "Supabase not configured", missing_env: supaMissing }, 500);

  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("org_id", org_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post("/invoices", async (c) => {
  const body = await parseJson(c);
  if (!body) return c.json({ error: "invalid JSON" }, 400);
  const { org_id, customer_id, items = [], notes, due_date, tax_rate, tax_mode, discount_amt } = body;

  const orgError = requireOrgId(org_id, c);
  if (orgError) return orgError;
  if (isBlank(customer_id)) return c.json({ error: "customer_id required" }, 400);

  const { items: normalizedItems, error: itemsError } = normalizeInvoiceItems(items);
  if (itemsError) return c.json({ error: itemsError }, 400);

  const { client: supabase, missing: supaMissing } = createSupabase(c.env);
  if (!supabase) return c.json({ error: "Supabase not configured", missing_env: supaMissing }, 500);

  try {
    const { invoice, total } = await createInvoice(supabase, {
      org_id,
      customer_id,
      items: normalizedItems,
      notes,
      due_date,
      tax_rate,
      tax_mode,
      discount_amt,
    });

    return c.json({ success: true, invoice, message: `Bill ${invoice.invoice_number} (${formatInr(total)}) create ho gaya! ✅` });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post("/payments", async (c) => {
  const body = await parseJson(c);
  if (!body) return c.json({ error: "invalid JSON" }, 400);
  const { org_id, invoice_id, amount, payment_mode, reference_no } = body;

  const orgError = requireOrgId(org_id, c);
  if (orgError) return orgError;
  if (isBlank(invoice_id)) return c.json({ error: "invoice_id required" }, 400);
  const amtError = requirePositiveNumber(amount, "amount", c);
  if (amtError) return amtError;

  const { client: supabase, missing: supaMissing } = createSupabase(c.env);
  if (!supabase) return c.json({ error: "Supabase not configured", missing_env: supaMissing }, 500);

  try {
    const payment = await createPayment(supabase, {
      org_id,
      invoice_id,
      amount: Number(amount),
      payment_mode,
      reference_no,
    });

    return c.json({ success: true, payment, message: `₹${Number(amount).toLocaleString("en-IN")} payment record ho gaya! ✅` });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post("/expenses", async (c) => {
  const body = await parseJson(c);
  if (!body) return c.json({ error: "invalid JSON" }, 400);
  const { org_id, amount, category, vendor, notes, date } = body;

  const orgError = requireOrgId(org_id, c);
  if (orgError) return orgError;
  const amtError = requirePositiveNumber(amount, "amount", c);
  if (amtError) return amtError;

  const { client: supabase, missing: supaMissing } = createSupabase(c.env);
  if (!supabase) return c.json({ error: "Supabase not configured", missing_env: supaMissing }, 500);

  try {
    const { data, error } = await supabase
      .from("expenses")
      .insert([{ org_id, amount: Number(amount), category: category || "Other", vendor, notes, date: date || new Date().toISOString().split("T")[0] }])
      .select()
      .single();
    if (error) throw error;
    return c.json({ success: true, expense: data, message: "Kharch record ho gaya ji! ✅" });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post("/tasks", async (c) => {
  const body = await parseJson(c);
  if (!body) return c.json({ error: "invalid JSON" }, 400);
  const { org_id, title, customer_id, due_date, priority } = body;

  const orgError = requireOrgId(org_id, c);
  if (orgError) return orgError;
  if (isBlank(title)) return c.json({ error: "title required" }, 400);

  const { client: supabase, missing: supaMissing } = createSupabase(c.env);
  if (!supabase) return c.json({ error: "Supabase not configured", missing_env: supaMissing }, 500);

  try {
    const { data, error } = await supabase
      .from("tasks")
      .insert([{ org_id, title, customer_id, due_date, priority: priority || "Medium" }])
      .select()
      .single();
    if (error) throw error;
    return c.json({ success: true, task: data, message: `Task "${title}" add ho gaya! ✅` });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get("/dashboard", async (c) => {
  const org_id = c.req.query("org_id");
  const orgError = requireOrgId(org_id, c);
  if (orgError) return orgError;

  const { client: supabase, missing: supaMissing } = createSupabase(c.env);
  if (!supabase) return c.json({ error: "Supabase not configured", missing_env: supaMissing }, 500);

  try {
    const today = new Date().toISOString().split("T")[0];

    const [invRes, custRes, taskRes, payRes] = await Promise.all([
      supabase.from("invoices").select("total_amount, paid_amount, status").eq("org_id", org_id),
      supabase.from("customers").select("customer_id").eq("org_id", org_id).eq("is_active", true),
      supabase.from("tasks").select("task_id").eq("org_id", org_id).eq("status", "Pending").lte("due_date", today + "T23:59:59"),
      supabase.from("payments").select("amount").eq("org_id", org_id).gte("date", today),
    ]);

    const errors = [invRes.error, custRes.error, taskRes.error, payRes.error].filter(Boolean);
    if (errors.length) throw new Error(errors.map((e) => e.message).join(" | "));

    const invoices = invRes.data || [];
    const totalDue = invoices.filter((i) => i.status !== "Paid")
      .reduce((s, i) => s + (toNumber(i.total_amount) - toNumber(i.paid_amount)), 0);
    const todayCollection = (payRes.data || []).reduce((s, p) => s + toNumber(p.amount), 0);

    return c.json({
      totalDue,
      todayCollection,
      activeCustomers: (custRes.data || []).length,
      todayFollowups: (taskRes.data || []).length,
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

const SYSTEM_PROMPT = `
Tu Vyapai AI hai — ek expert Hindi/Hinglish CRM aur accounting assistant for Indian MSMEs.
Tujhe Sudarshan Traders (Lucknow) ke liye business decisions mein help karni hai.

Rules:
1. Hamesha Hinglish mein jawab de (Hindi + English mix). 
2. Business-focused, short, aur actionable replies do.
3. Amounts ₹ symbol ke saath likho, Indian format mein (e.g., ₹1,42,500).
4. "ji" se respectfully baat karo.
5. JSON format mein action return karo jab data operation ho.
6. Har reply mein ek concrete next step suggest karo.

Action JSON format:
{
  "action": "GET_BALANCE | ADD_CUSTOMER | CREATE_INVOICE | ADD_PAYMENT | CREATE_TASK | QUERY_TASKS | QUERY_INVOICES | GET_INSIGHTS",
  "parameters": { ... },
  "reply": "Hinglish mein reply...",
  "next_step": "Agle kaam ka suggestion..."
}
`;

const INSIGHTS_PROMPT = `
Tu Vyapai AI Business Advisor hai. Neeche diye gaye MSME business data ke basis pe:
1. 3 Voice Insights do — short, powerful Hindi sentences jo owner ko turant samajh aaye.
2. 5 Action Points do — specific, doable, aaj ke liye.

Data:
{DATA}

Response format (JSON only, no markdown):
{
  "voice_insights": [
    { "hindi": "...", "english": "...", "icon": "emoji", "type": "warning|success|info" }
  ],
  "action_points": [
    { "hindi": "...", "english": "...", "priority": "high|medium|low", "category": "collections|sales|expense|followup|growth", "icon": "emoji" }
  ]
}
`;

export const onRequest = (context) => app.fetch(context.request, context.env, context);
