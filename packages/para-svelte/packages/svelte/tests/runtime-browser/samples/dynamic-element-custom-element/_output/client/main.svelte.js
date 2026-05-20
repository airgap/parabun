import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<!> <my-custom-element></my-custom-element>`, 3);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	class MyCustomElement extends HTMLElement {
		constructor() {
			super();
			this._name = null;
		}

		/**
		 * @param {string} name
		 */
		set name(name) {
			this._name = name;
			this.render();
		}

		connectedCallback() {
			this.render();
		}

		render() {
			this.innerHTML = "Hello " + this._name + "!";
		}
	}

	window.customElements.define("my-custom-element", MyCustomElement);

	let tag = $.prop($$props, 'tag', 12);
	let name = $.prop($$props, 'name', 12);

	var $$exports = {
		get tag() {
			return tag();
		},

		set tag($$value) {
			tag($$value);
			$.flush();
		},

		get name() {
			return name();
		},

		set name($$value) {
			name($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.element(node, tag, false, ($$element, $$anchor) => {
		$.attribute_effect($$element, () => ({ name: name(), id: 'a' }));
	});

	var my_custom_element = $.sibling(node, 2);

	$.template_effect(() => $.set_custom_element_data(my_custom_element, 'name', name()));
	$.set_custom_element_data(my_custom_element, 'id', 'b');
	$.append($$anchor, fragment);

	return $.pop($$exports);
}