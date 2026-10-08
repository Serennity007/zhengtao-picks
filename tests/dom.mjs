import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
const { window } = dom;

globalThis.window = window;
globalThis.document = window.document;
globalThis.DOMParser = window.DOMParser;
globalThis.Node = window.Node;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;

// 插件用 window.open 打开外链；jsdom 默认会走导航实现，这里换成可断言的记录器。
window.__openedUrls = [];
window.open = (url) => {
  window.__openedUrls.push(url);
  return null;
};

function applyOptions(el, options) {
  if (options.cls) {
    for (const name of String(options.cls).split(/\s+/).filter(Boolean)) el.classList.add(name);
  }
  if (options.text !== undefined) el.setText(String(options.text));
  if (options.attr) {
    for (const [key, value] of Object.entries(options.attr)) el.setAttribute(key, String(value));
  }
}

// Obsidian 在运行时给所有 Element 加上的助手方法，这里按同名同签名补齐，供测试使用。
Element.prototype.setText = function (value) {
  this.textContent = value;
  return this;
};
Element.prototype.empty = function () {
  while (this.firstChild) this.removeChild(this.firstChild);
  return this;
};
Element.prototype.toggleClass = function (name, value = true) {
  this.classList.toggle(name, Boolean(value));
  return this;
};
Element.prototype.setAttr = function (name, value) {
  this.setAttribute(name, String(value));
  return this;
};
Element.prototype.getAttr = function (name) {
  return this.getAttribute(name);
};
Element.prototype.removeAttr = function (name) {
  this.removeAttribute(name);
  return this;
};
Element.prototype.removeClass = function (name) {
  this.classList.remove(name);
  return this;
};
Element.prototype.addClass = function (name) {
  this.classList.add(name);
  return this;
};
Element.prototype.createDiv = function (options = {}) {
  const el = document.createElement('div');
  applyOptions(el, options);
  this.appendChild(el);
  return el;
};
Element.prototype.createEl = function (tag, options = {}) {
  const el = document.createElement(tag);
  applyOptions(el, options);
  this.appendChild(el);
  return el;
};
