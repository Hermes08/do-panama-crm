import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { messages, lang = 'es' } = JSON.parse(event.body || '{}');

        // 1. Fetch CRM Data for Context
        const { data: clients, error: fetchError } = await supabase
            .from('crm_clients')
            .select('*');

        if (fetchError) throw fetchError;

        // 2. Prepare Context Summary (keep it under a reasonable token limit)
        const clientSummary = (clients || []).map(c =>
            `- ${c.full_name}: Status=${c.status}, Tag=${c.tag}, Budget=${c.budget}, Interest=${c.interest_category}, Project=${c.zone_project}, Notes=${c.detailed_notes?.slice(0, 100)}`
        ).join('\n');

        const systemPrompt = lang === 'es'
            ? `Eres el Asistente Inteligente de DO Panama CRM. Tienes acceso a los siguientes clientes:\n\n${clientSummary}\n\nTu objetivo es ayudar al usuario a gestionar sus leads. Puedes analizar datos, responder preguntas sobre clientes y realizar acciones como actualizar etiquetas o estados usando las herramientas proporcionadas. Sé profesional, conciso y proactivo.`
            : `You are the DO Panama CRM Intelligent Assistant. You have access to the following clients:\n\n${clientSummary}\n\nYour goal is to help the user manage their leads. You can analyze data, answer questions about clients, and perform actions like updating tags or statuses using the provided tools. Be professional, concise, and proactive.`;

        // 3. Call OpenAI with Tooling
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                ...messages
            ],
            tools: [
                {
                    type: "function",
                    function: {
                        name: "update_client",
                        description: "Update a client's information in the CRM.",
                        parameters: {
                            type: "object",
                            properties: {
                                client_name: { type: "string", description: "Full name of the client to update" },
                                updates: {
                                    type: "object",
                                    properties: {
                                        status: { type: "string" },
                                        tag: { type: "string" },
                                        detailed_notes: { type: "string" }
                                    }
                                }
                            },
                            required: ["client_name", "updates"]
                        }
                    }
                }
            ],
            tool_choice: "auto"
        });

        const assistantMessage = response.choices[0].message;

        // 4. Handle Tool Calls (Synchronous execution for simplicity in this CRM setup)
        if (assistantMessage.tool_calls) {
            for (const toolCall of assistantMessage.tool_calls) {
                // Cast to any to avoid TS union type errors, as we only defined function tools
                const tc = toolCall as any;
                if (tc.function && tc.function.name === 'update_client') {
                    const args = JSON.parse(tc.function.arguments);

                    // Find actual ID by name
                    const target = clients?.find(c =>
                        c.full_name.toLowerCase().includes(args.client_name.toLowerCase())
                    );

                    if (target) {
                        const { error: updateError } = await supabase
                            .from('crm_clients')
                            .update(args.updates)
                            .eq('id', target.id);

                        if (updateError) console.error("Update Tool Error:", updateError);
                    }
                }
            }

            // After tool calls, we should ideally get a new completion, 
            // but for a faster UI feel, we'll just acknowledge the action in the response if possible,
            // or perform a second call. Let's do a second call to close the loop.
            const secondResponse = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    ...messages,
                    assistantMessage,
                    {
                        role: "tool",
                        tool_call_id: assistantMessage.tool_calls[0].id,
                        content: "Success: Client information has been updated in the database."
                    }
                ]
            });

            return {
                statusCode: 200,
                body: JSON.stringify({
                    content: secondResponse.choices[0].message.content,
                    actionTaken: true
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ content: assistantMessage.content })
        };

    } catch (error: any) {
        console.error("Assistant Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
