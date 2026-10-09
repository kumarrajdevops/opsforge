import '@testing-library/jest-dom/vitest'

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// React Flow measures with these browser APIs, which jsdom does not provide.
if (!('ResizeObserver' in window)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.assign(window, { ResizeObserver: ResizeObserverStub })
}

if (!('DOMMatrixReadOnly' in window)) {
  class DOMMatrixReadOnlyStub {
    m22 = 1
    constructor(transform?: string) {
      const scale = transform?.match(/scale\(([\d.]+)\)/)
      if (scale) this.m22 = Number(scale[1])
    }
  }
  Object.assign(window, { DOMMatrixReadOnly: DOMMatrixReadOnlyStub })
}
