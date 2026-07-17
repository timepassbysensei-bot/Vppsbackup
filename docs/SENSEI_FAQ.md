# Updating Sensei (chatbot) answers

Sensei answers **only** from approved sources: the `chatbot_faqs` table, public
`school_settings`, published notices/events, and admission availability. It never
sees private data, and its system prompt lives server-side only.

## Edit FAQs

FAQs live in `chatbot_faqs` (editable by the principal). Each row has a topic and
question/answer in English and (optionally) Hindi:

```sql
insert into chatbot_faqs (topic, question_en, answer_en, question_hi, answer_hi)
values ('transport',
  'Does the school provide transport?',
  'Yes, school transport is available. Please contact the office for routes.',
  'क्या विद्यालय परिवहन उपलब्ध कराता है?',
  'हाँ, विद्यालय परिवहन उपलब्ध है। मार्गों के लिए कृपया कार्यालय से संपर्क करें।');
```

Set `is_active = false` to retire an answer without deleting it.

## Enable / disable the bot

`chatbot_settings.enabled` toggles the widget's answering. When disabled, the
widget shows the fallback with helpful buttons (Contact / Notices / Homework /
Message). The disclaimer text is also stored there.

## Guardrails (do not weaken)

- Never add private data (complaints, phones, leave, DOB) to FAQs.
- Never restate fees — the approved line is "For fee information, please contact
  the school office directly."
- The model treats retrieved content as untrusted data and refuses prompt-injection
  / system-prompt-extraction attempts. Keep the system prompt only in
  `netlify/functions/_shared/sensei-config.ts`.
