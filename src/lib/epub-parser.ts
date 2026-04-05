import JSZip from 'jszip';

export interface EpubChapter {
	title: string;
	paragraphs: string[];
}

export interface EpubBook {
	title: string;
	author: string;
	chapters: EpubChapter[];
}

export async function parseEpub(buffer: ArrayBuffer): Promise<EpubBook> {
	const zip = await JSZip.loadAsync(buffer);

	// 1. Read container.xml to find the OPF path
	const containerFile = zip.file('META-INF/container.xml');
	if (!containerFile) {
		throw new Error('Invalid EPUB: META-INF/container.xml not found');
	}

	const containerXml = await containerFile.async('text');
	const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');

	const rootfileEl = containerDoc.querySelector('rootfile');
	if (!rootfileEl) {
		throw new Error('Invalid EPUB: no <rootfile> element found in container.xml');
	}

	const opfPath = rootfileEl.getAttribute('full-path');
	if (!opfPath) {
		throw new Error('Invalid EPUB: rootfile element has no full-path attribute');
	}

	// 2. Read and parse the OPF file
	const opfFile = zip.file(opfPath);
	if (!opfFile) {
		throw new Error(`Invalid EPUB: OPF file not found at "${opfPath}"`);
	}

	const opfXml = await opfFile.async('text');
	const opfDoc = new DOMParser().parseFromString(opfXml, 'application/xml');

	// Determine the base directory of the OPF for resolving relative paths
	const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

	// 3. Extract metadata
	const title = getTagText(opfDoc, 'dc:title') || getTagTextNS(opfDoc, 'title') || 'Unknown Title';
	const author =
		getTagText(opfDoc, 'dc:creator') || getTagTextNS(opfDoc, 'creator') || 'Unknown Author';

	// 4. Build manifest map: id → href
	const manifestItems = new Map<string, string>();
	const itemEls = opfDoc.querySelectorAll('manifest > item');
	for (const item of itemEls) {
		const id = item.getAttribute('id');
		const href = item.getAttribute('href');
		if (id && href) {
			manifestItems.set(id, href);
		}
	}

	// 5. Get spine reading order
	const spineItemRefs: string[] = [];
	const itemrefEls = opfDoc.querySelectorAll('spine > itemref');
	for (const itemref of itemrefEls) {
		const idref = itemref.getAttribute('idref');
		if (idref) {
			spineItemRefs.push(idref);
		}
	}

	// 6. Process each spine item into a chapter
	const chapters: EpubChapter[] = [];
	let chapterIndex = 0;

	for (const idref of spineItemRefs) {
		const href = manifestItems.get(idref);
		if (!href) {
			continue;
		}

		// Resolve the full path within the ZIP
		const contentPath = resolveHref(opfDir, href);
		const contentFile = zip.file(contentPath);
		if (!contentFile) {
			continue;
		}

		const html = await contentFile.async('text');
		const doc = new DOMParser().parseFromString(html, 'application/xhtml+xml');

		// If the XHTML parser produced errors, retry as HTML
		const parserError = doc.querySelector('parsererror');
		const finalDoc = parserError
			? new DOMParser().parseFromString(html, 'text/html')
			: doc;

		// Extract chapter title from heading tags
		const chapterTitle = extractHeadingTitle(finalDoc) || `Chapter ${chapterIndex + 1}`;

		// Extract paragraphs from <p> tags
		const paragraphs = extractParagraphs(finalDoc);

		// Only add chapters that have actual content
		if (paragraphs.length > 0) {
			chapters.push({
				title: chapterTitle,
				paragraphs
			});
			chapterIndex++;
		}
	}

	return { title, author, chapters };
}

/**
 * Try to get text content of an element by tag name (works for prefixed names like dc:title).
 */
function getTagText(doc: Document, tagName: string): string | null {
	const el = doc.getElementsByTagName(tagName)[0];
	return el?.textContent?.trim() || null;
}

/**
 * Fallback: try to find DC metadata elements by local name using the DC namespace.
 */
function getTagTextNS(doc: Document, localName: string): string | null {
	const dcNS = 'http://purl.org/dc/elements/1.1/';
	const el = doc.getElementsByTagNameNS(dcNS, localName)[0];
	return el?.textContent?.trim() || null;
}

/**
 * Resolve a potentially relative href against the OPF directory.
 * Handles cases like "../Text/chapter1.xhtml" or just "chapter1.xhtml".
 */
function resolveHref(baseDir: string, href: string): string {
	// Decode percent-encoded characters
	const decodedHref = decodeURIComponent(href);

	if (!baseDir) {
		return decodedHref;
	}

	// Split base directory into parts and navigate relative segments
	const baseParts = baseDir.replace(/\/$/, '').split('/');
	const hrefParts = decodedHref.split('/');

	const resolved = [...baseParts];
	for (const part of hrefParts) {
		if (part === '..') {
			resolved.pop();
		} else if (part !== '.' && part !== '') {
			resolved.push(part);
		}
	}

	return resolved.join('/');
}

/**
 * Try to extract a chapter title from heading elements in the document.
 */
function extractHeadingTitle(doc: Document): string | null {
	for (const tag of ['h1', 'h2', 'h3']) {
		const el = doc.querySelector(tag);
		if (el) {
			const text = el.textContent?.trim();
			if (text) {
				return text;
			}
		}
	}
	return null;
}

/**
 * Extract paragraph text content from <p> tags in the document.
 * Filters out empty or whitespace-only paragraphs.
 */
function extractParagraphs(doc: Document): string[] {
	const paragraphs: string[] = [];
	const pElements = doc.querySelectorAll('p');

	for (const p of pElements) {
		const text = p.textContent?.trim();
		if (text) {
			paragraphs.push(text);
		}
	}

	return paragraphs;
}
