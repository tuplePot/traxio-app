import type { NewsItem } from "./interface"

export function cleanHtmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&ndash;/g, "–")
        .replace(/&mdash;/g, "—")
}

export function cleanCdata(str: string): string {
    return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
}

export function getDomain(url: string): string {
    try {
        const parsed = new URL(url)
        return parsed.hostname.replace("www.", "")
    } catch {
        return "news.google.com"
    }
}

export function parseGoogleNewsXml(xml: string): NewsItem[] {
    const items: NewsItem[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    let id = 1

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemContent = match[1]

        const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/)
        const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/)
        const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/)
        const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/)

        if (titleMatch && linkMatch) {
            let fullTitle = titleMatch[1].trim()
            fullTitle = cleanHtmlEntities(fullTitle)

            let title = fullTitle
            let sourceName = sourceMatch ? sourceMatch[1].trim() : "Google News"

            const sourceDashIndex = fullTitle.lastIndexOf(" - ")
            if (sourceDashIndex !== -1) {
                title = fullTitle.substring(0, sourceDashIndex).trim()
                sourceName = fullTitle.substring(sourceDashIndex + 3).trim()
            }

            title = cleanCdata(title)
            sourceName = cleanCdata(sourceName)
            const url = linkMatch[1].trim()

            const lowerTitle = title.toLowerCase()
            let sentiment: NewsItem["sentiment"] = "neutral"
            if (
                lowerTitle.includes("rally") ||
                lowerTitle.includes("surge") ||
                lowerTitle.includes("bull") ||
                lowerTitle.includes("gain") ||
                lowerTitle.includes("upbeat") ||
                lowerTitle.includes("rise") ||
                lowerTitle.includes("breakout") ||
                lowerTitle.includes("growth") ||
                lowerTitle.includes("high") ||
                lowerTitle.includes("skyrocket")
            ) {
                sentiment = "positive"
            } else if (
                lowerTitle.includes("drop") ||
                lowerTitle.includes("fall") ||
                lowerTitle.includes("bear") ||
                lowerTitle.includes("plunge") ||
                lowerTitle.includes("slide") ||
                lowerTitle.includes("dip") ||
                lowerTitle.includes("crash") ||
                lowerTitle.includes("warn") ||
                lowerTitle.includes("fear") ||
                lowerTitle.includes("regulatory") ||
                lowerTitle.includes("lawsuit") ||
                lowerTitle.includes("charges") ||
                lowerTitle.includes("subpoena") ||
                lowerTitle.includes("seized")
            ) {
                sentiment = "negative"
            }

            items.push({
                id: String(id++),
                title,
                source: {
                    title: sourceName,
                    domain: getDomain(url),
                },
                publishedAt: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
                url,
                sentiment,
            })
        }
    }

    return items
}