export function formatPrice(
  usdPrice: number,
  currency: string,
  usdToIdr: number,
): string {
  if (currency === "IDR") {
    const idrPrice = usdPrice * usdToIdr
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(idrPrice)
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(usdPrice)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n)
}

export function formatCandlePrice(
  price: number,
  isIDR: boolean,
  currency: string,
  usdToIdr: number,
): string {
  if (isIDR) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }
  return formatPrice(price, currency, usdToIdr)
}
