

function c2h(value): number {
  return value.toString() / Math.pow(10,24)
}

function nearToYocta(nbNear): string {
  return parseInt(nbNear).toString() + '000000000000000000000000';
}

export {
  c2h,
  nearToYocta,
}