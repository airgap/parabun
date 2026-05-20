import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<my-custom-element></my-custom-element>`, 2);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	class MyCustomElement extends HTMLElement {
		constructor() {
			super();
			this._obj = null;
		}

		set camelCase(obj) {
			this._obj = obj;
			this.render();
		}

		connectedCallback() {
			this.render();
		}

		render() {
			this.innerHTML = 'Hello ' + this._obj.text + '!';
		}
	}

	window.customElements.define('my-custom-element', MyCustomElement);
	$.init();

	var my_custom_element = root();

	$.set_custom_element_data(my_custom_element, 'camelCase', { text: 'World' });
	$.append($$anchor, my_custom_element);
	$.pop();
}