const normalizeWhatsAppNumber = (value) =>
  String(value || '')
    .replace(/[^\d]/g, '')
    .replace(/^0/, '234');

export const PAST_QUESTION_WHATSAPP_NUMBER = normalizeWhatsAppNumber(
  process.env.EXPO_PUBLIC_PAST_QUESTION_WHATSAPP_NUMBER
);

export const buildPastQuestionWhatsAppUrl = () => {
  if (!PAST_QUESTION_WHATSAPP_NUMBER) return '';
  const message = 'Hi UniHelp, I want to contribute a past question.';
  return `https://wa.me/${PAST_QUESTION_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};
