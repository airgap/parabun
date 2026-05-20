import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import './my-widget.svelte';

var root = $.from_html(`<div class="svelte-11rsm3o">hi</div> <p class="svelte-11rsm3o">hi</p> <button>off</button> <my-widget></my-widget>`, 3);

const $$css = {
	hash: 'svelte-11rsm3o',
	code: ':host([red]) div.svelte-11rsm3o {color:red;}:host([white]) p.svelte-11rsm3o {color:white;}'
};

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);
	$.append_styles($$anchor, $$css);

	let red = $.prop($$props, 'red', 12);

	red();

	var $$exports = {
		get red() {
			return red();
		},

		set red($$value) {
			red($$value);
			$.flush();
		}
	};

	var fragment = root();
	var button = $.sibling($.first_child(fragment), 4);
	var my_widget = $.sibling(button, 2);

	$.template_effect(() => $.set_custom_element_data(my_widget, 'red', red()));
	$.set_custom_element_data(my_widget, 'white', true);
	$.event('click', button, () => red(false));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}

customElements.define('custom-element', $.create_custom_element(_unknown_, { red: { reflect: true, type: 'Boolean' } }, [], [], { mode: 'open' }));