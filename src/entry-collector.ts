import type { HatenaEntry } from "./types";

/**
 * はてなブックマークのhotentryページHTMLからエントリ情報を抽出する。
 * HTMLRewriterのストリーミングパースを使用。
 *
 * HTML構造:
 * .entrylist-contents-main 内に
 *   h3.entrylist-contents-title > a[href] (タイトル・URL)
 *   .entrylist-contents-users > a > span (ブクマ数 "446 users")
 *   .entrylist-contents-domain > a > span (ドメイン)
 *   .entrylist-contents-description > p (説明文)
 *   .entrylist-contents-date (カテゴリ・日時)
 *   .entrylist-contents-tags > a (タグ)
 *   .entrylist-contents-thumb > a > img[src] (サムネイル)
 */
export class EntryCollector {
  readonly entries: HatenaEntry[] = [];

  private currentTitle = "";
  private currentUrl = "";
  private currentUsers = 0;
  private currentDomain = "";
  private currentDescription = "";
  private currentCategory = "";
  private currentDate = "";
  private currentTags: string[] = [];
  private currentImageUrl?: string;

  private collectingTitle = false;
  private collectingUsers = false;
  private collectingDomain = false;
  private collectingDescription = false;
  private collectingDate = false;
  private collectingTag = false;
  private currentTagText = "";

  startEntry() {
    this.currentTitle = "";
    this.currentUrl = "";
    this.currentUsers = 0;
    this.currentDomain = "";
    this.currentDescription = "";
    this.currentCategory = "";
    this.currentDate = "";
    this.currentTags = [];
    this.currentImageUrl = undefined;
  }

  finishEntry() {
    if (this.currentTitle && this.currentUrl) {
      this.entries.push({
        title: this.currentTitle.trim(),
        url: this.currentUrl,
        description: this.currentDescription.trim(),
        users: this.currentUsers,
        domain: this.currentDomain.trim(),
        category: this.currentCategory.trim(),
        date: this.currentDate.trim(),
        tags: [...this.currentTags],
        imageUrl: this.currentImageUrl,
      });
    }
  }

  setTitleUrl(href: string) {
    this.currentUrl = href;
  }

  startTitleText() {
    this.collectingTitle = true;
  }
  appendTitleText(text: string) {
    if (this.collectingTitle) this.currentTitle += text;
  }
  endTitleText() {
    this.collectingTitle = false;
  }

  startUsersText() {
    this.collectingUsers = true;
  }
  appendUsersText(text: string) {
    if (this.collectingUsers) {
      const match = text.match(/(\d+)/);
      if (match) this.currentUsers = parseInt(match[1], 10);
    }
  }
  endUsersText() {
    this.collectingUsers = false;
  }

  startDomainText() {
    this.collectingDomain = true;
  }
  appendDomainText(text: string) {
    if (this.collectingDomain) this.currentDomain += text;
  }
  endDomainText() {
    this.collectingDomain = false;
  }

  startDescriptionText() {
    this.collectingDescription = true;
  }
  appendDescriptionText(text: string) {
    if (this.collectingDescription) this.currentDescription += text;
  }
  endDescriptionText() {
    this.collectingDescription = false;
  }

  startDateText() {
    this.collectingDate = true;
  }
  appendDateText(text: string) {
    if (this.collectingDate) {
      const trimmed = text.trim();
      if (trimmed) {
        if (this.currentDate) {
          this.currentDate += " " + trimmed;
        } else {
          this.currentDate = trimmed;
        }
      }
    }
  }
  endDateText() {
    this.collectingDate = false;
    // パース対象: "テクノロジー 2026/02/10 01:17" → category="テクノロジー", date="2026/02/10 01:17"
    const parts = this.currentDate.split(/\s+/);
    if (parts.length >= 2) {
      const dateStr = parts[parts.length - 2];
      const timeStr = parts[parts.length - 1];
      if (dateStr && /\d{4}\/\d{2}\/\d{2}/.test(dateStr)) {
        this.currentDate = `${dateStr} ${timeStr}`;
        this.currentCategory = parts.slice(0, parts.length - 2).join(" ");
      }
    }
  }

  startTagText() {
    this.collectingTag = true;
    this.currentTagText = "";
  }
  appendTagText(text: string) {
    if (this.collectingTag) this.currentTagText += text;
  }
  endTagText() {
    if (this.collectingTag && this.currentTagText.trim()) {
      this.currentTags.push(this.currentTagText.trim());
    }
    this.collectingTag = false;
  }

  setImageUrl(src: string) {
    this.currentImageUrl = src;
  }
}

export class TitleLinkHandler implements HTMLRewriterElementContentHandlers {
  constructor(private readonly collector: EntryCollector) {}

  element(e: Element) {
    const href = e.getAttribute("href");
    if (href) {
      this.collector.setTitleUrl(href);
    }
    this.collector.startTitleText();
  }

  text(t: Text) {
    this.collector.appendTitleText(t.text);
    if (t.lastInTextNode) {
      this.collector.endTitleText();
    }
  }
}

export class UsersHandler implements HTMLRewriterElementContentHandlers {
  constructor(private readonly collector: EntryCollector) {}

  element() {
    this.collector.startUsersText();
  }

  text(t: Text) {
    this.collector.appendUsersText(t.text);
    if (t.lastInTextNode) {
      this.collector.endUsersText();
    }
  }
}

export class DomainHandler implements HTMLRewriterElementContentHandlers {
  constructor(private readonly collector: EntryCollector) {}

  element() {
    this.collector.startDomainText();
  }

  text(t: Text) {
    this.collector.appendDomainText(t.text);
    if (t.lastInTextNode) {
      this.collector.endDomainText();
    }
  }
}

export class DescriptionHandler implements HTMLRewriterElementContentHandlers {
  constructor(private readonly collector: EntryCollector) {}

  element() {
    this.collector.startDescriptionText();
  }

  text(t: Text) {
    this.collector.appendDescriptionText(t.text);
    if (t.lastInTextNode) {
      this.collector.endDescriptionText();
    }
  }
}

export class DateHandler implements HTMLRewriterElementContentHandlers {
  constructor(private readonly collector: EntryCollector) {}

  element() {
    this.collector.startDateText();
  }

  text(t: Text) {
    this.collector.appendDateText(t.text);
    if (t.lastInTextNode) {
      this.collector.endDateText();
    }
  }
}

export class TagHandler implements HTMLRewriterElementContentHandlers {
  constructor(private readonly collector: EntryCollector) {}

  element() {
    this.collector.startTagText();
  }

  text(t: Text) {
    this.collector.appendTagText(t.text);
    if (t.lastInTextNode) {
      this.collector.endTagText();
    }
  }
}

export class ImageHandler implements HTMLRewriterElementContentHandlers {
  constructor(private readonly collector: EntryCollector) {}

  element(e: Element) {
    const src = e.getAttribute("src");
    if (src) {
      this.collector.setImageUrl(src);
    }
  }
}

export async function extractEntries(response: Response): Promise<HatenaEntry[]> {
  const collector = new EntryCollector();

  let entryStarted = false;

  const boundaryHandler: HTMLRewriterElementContentHandlers = {
    element() {
      if (entryStarted) {
        collector.finishEntry();
      }
      collector.startEntry();
      entryStarted = true;
    },
  };

  const rewriter = new HTMLRewriter()
    .on(".entrylist-contents-main", boundaryHandler)
    .on(".entrylist-contents-title a", new TitleLinkHandler(collector))
    .on(".entrylist-contents-users span", new UsersHandler(collector))
    .on(".entrylist-contents-domain a span", new DomainHandler(collector))
    .on(".entrylist-contents-description", new DescriptionHandler(collector))
    .on(".entrylist-contents-date", new DateHandler(collector))
    .on(".entrylist-contents-tags a", new TagHandler(collector))
    .on(".entrylist-contents-thumb img", new ImageHandler(collector));

  const transformed = rewriter.transform(response);
  await transformed.arrayBuffer();

  if (entryStarted) {
    collector.finishEntry();
  }

  return collector.entries;
}
