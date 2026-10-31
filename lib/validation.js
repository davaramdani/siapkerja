export class ValidationError extends Error {}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = () => { throw new ValidationError('Invalid practice request'); };

export function validateRequest(body) {
  if (!isObject(body) || !['start', 'answer', 'summary'].includes(body.action)) fail();
  const source = body.settings;
  if (!isObject(source)) fail();
  if (typeof source.role !== 'string' || !source.role.trim() || source.role.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(source.role)) fail();
  if (!['fresh', 'junior', 'mid'].includes(source.level)) fail();
  if (!['hr', 'technical'].includes(source.type)) fail();
  if (!['id', 'en'].includes(source.language)) fail();
  if (![3, 5, 7].includes(source.totalQuestions)) fail();
  const settings = {
    role: source.role.trim(),
    level: source.level,
    type: source.type,
    language: source.language,
    totalQuestions: source.totalQuestions,
  };
  const { action, conversation, questionIndex } = body;
  if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex > settings.totalQuestions) fail();
  if (!Array.isArray(conversation) || conversation.length > settings.totalQuestions * 2 + 1) fail();
  const history = conversation.map((message, index) => {
    if (!isObject(message) || message.role !== (index % 2 === 0 ? 'model' : 'user')) fail();
    if (typeof message.text !== 'string' || !message.text.trim() || message.text.length > 6000 || /\u0000/.test(message.text)) fail();
    return { role: message.role, text: message.text.trim() };
  });
  if (action === 'start' && (questionIndex !== 0 || history.length !== 0)) fail();
  if (action === 'answer' && (questionIndex < 1 || history.length !== questionIndex * 2)) fail();
  if (action === 'summary' && (
    questionIndex !== settings.totalQuestions ||
    ![questionIndex * 2, questionIndex * 2 + 1].includes(history.length)
  )) fail();
  return { action, settings, conversation: history, questionIndex };
}
