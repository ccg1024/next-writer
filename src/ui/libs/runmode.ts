import { highlightTree } from '@lezer/highlight';
import { languages } from '@codemirror/language-data';
import type { HighlightStyle, Language, LanguageDescription } from '@codemirror/language';

type RunModeCallback = (text: string, style: string | null, from: number, to: number) => void;

const LANGUAGE_CACHE = {} as Record<string, boolean>;

function languageCacheCover(name: string) {
  if (['js', 'javascript'].includes(name)) {
    return 'js';
  }

  if (['ts', 'typescript'].includes(name)) {
    return 'ts';
  }

  if (['jsx', 'javascriptreact'].includes(name)) {
    return 'jsx';
  }

  if (['tsx', 'typescriptreact'].includes(name)) {
    return 'tsx';
  }

  if (['md', 'markdown'].includes(name)) {
    return 'markdown';
  }

  return name;
}

function runmode(
  textContent: string,
  language: Language,
  callback: RunModeCallback,
  highlighter: HighlightStyle,
  onLanguageLoad?: (name: string) => void
): void {
  const tree = language.parser.parse(textContent);
  tree.iterate({
    enter(node) {
      if (node.name === 'CodeInfo') {
        const cacheCodeInfo = languageCacheCover(textContent.slice(node.from, node.to));
        if (!LANGUAGE_CACHE[cacheCodeInfo]) {
          getLanguage(cacheCodeInfo).then(() => {
            LANGUAGE_CACHE[cacheCodeInfo] = true;
            onLanguageLoad && onLanguageLoad(cacheCodeInfo);
          });
        }
      }
    }
  });
  let pos = 0;
  // injectCssStyle(highlighter.module.getRules());
  highlightTree(
    tree,
    highlighter,
    (from, to, classes) => {
      if (from > pos) {
        callback(textContent.slice(pos, from), null, pos, from);
      }
      callback(textContent.slice(from, to), classes, from, to);
      pos = to;
    },
    0,
    tree.length
  );

  if (pos !== tree.length) {
    callback(textContent.slice(pos, tree.length), null, pos, tree.length);
  }
}

function findLanguage(langName: string): LanguageDescription | null {
  const i = languages.findIndex((lang: LanguageDescription) => {
    if (lang.alias.indexOf(langName) >= 0) {
      return true;
    }
  });

  if (i >= 0) {
    return languages[i];
  }
  return null;
}

export async function getLanguage(langName: string): Promise<Language | null> {
  const desc = findLanguage(langName);
  if (desc) {
    const langSupport = await desc.load();
    return langSupport.language;
  }

  return null;
}

export default runmode;
