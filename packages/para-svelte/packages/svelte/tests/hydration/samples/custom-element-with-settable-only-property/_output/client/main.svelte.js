import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

if (!customElements.get('custom-element-with-settable-only-property')) {
	customElements.define('custom-element-with-settable-only-property', class CustomElement extends HTMLElement {
		set prop(n) {
			this.value = n;
		}

		get prop() {
			// invoking this getter shouldn't make hydration fail
			throw new Error('This value is not gettable');
		}
	});
}

var root = $.from_html(`<custom-element-with-settable-only-property></custom-element-with-settable-only-property>`, 2);

export default function Main($$anchor, $$props) {
	$.push($$props, false);
	$.init();

	var custom_element_with_settable_only_property = root();

	$.set_custom_element_data(custom_element_with_settable_only_property, 'prop', '8');
	$.append($$anchor, custom_element_with_settable_only_property);
	$.pop();
}