/// <mls fileReference="_102032_/l2/collabLandingPage.ts" enhancement="_102027_/l2/enhancementLit"/>

//import { LitElement } from 'lit';

/**
 * Class extending LitElement with CollabState functionality.
 */
export class CollabLandingPage extends HTMLElement {

  createRenderRoot() {
    return this;
  }

  getMessageKey(messages: any): string {
    return getMessageKey(messages);
  }

  loadStyle(css: string) {
    if (!css) return;
    const tagName = this.tagName.toLowerCase();
    const alreadyAdded = document.head.querySelector(`style#${tagName}`);
    if (alreadyAdded) {
      alreadyAdded.textContent = css;
      return;
    }
    const style = document.createElement('style');
    style.id = tagName;
    style.textContent = css;
    document.head.appendChild(style);
  }

}

export function getMessageKey(messages: any): string {
  const keys = Object.keys(messages);
  if (!keys || keys.length < 1) throw new Error('Error Message not valid for international');
  const firstKey = keys[0];
  const lang = (document.documentElement.lang || '').toLowerCase();
  if (!lang) return firstKey;
  if (messages.hasOwnProperty(lang)) return lang;
  const similarLang = keys.find((key: string) => lang.substring(0, 2) === key);
  if (similarLang) return similarLang;
  return firstKey;
}