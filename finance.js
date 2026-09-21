export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function centavosDe(valor) {
  return Math.round((Number(valor) || 0) * 100);
}

export function reaisDe(centavos) {
  return centavos / 100;
}

export function calcular(sheet) {
  const salarioBruto = round2(sheet && sheet.salarioBruto);
  const despesas = Array.isArray(sheet && sheet.despesas) ? sheet.despesas : [];

  const salarioCents = centavosDe(salarioBruto);
  const totalCents = despesas.reduce((soma, d) => soma + centavosDe(d && d.valor), 0);

  const total = reaisDe(totalCents);
  const disponivel = reaisDe(salarioCents - totalCents);

  const comprometidoPct =
    salarioCents > 0 ? Math.round((totalCents / salarioCents) * 1000) / 10 : 0;
  const disponivelPct =
    salarioCents > 0
      ? Math.round((Math.max(0, salarioCents - totalCents) / salarioCents) * 1000) / 10
      : 0;

  const situacao = disponivel < 0 ? 'negativo' : disponivel === 0 ? 'zero' : 'ok';

  return {
    salarioBruto,
    total,
    disponivel,
    comprometidoPct,
    disponivelPct,
    qtdDespesas: despesas.length,
    situacao,
  };
}