const hasKanji = (value: string) => /[\u3400-\u4DBF\u4E00-\u9FFF]/u.test(value);

const hasKana = (value: string) => /[\u3040-\u30FF]/u.test(value);

export const shouldFuriganizeToken = (
  token: string,
  context: string,
  contextIsJapanese = hasKana(context),
) => hasKana(token) || (contextIsJapanese && hasKanji(token));
