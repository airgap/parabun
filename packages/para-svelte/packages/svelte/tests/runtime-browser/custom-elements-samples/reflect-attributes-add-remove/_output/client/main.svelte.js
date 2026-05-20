import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><button>Toggle</button> <div>Hidden Text</div></div>`);

const $$css = {
	hash: 'svelte-2e2o1w',
	code: '.hidden.svelte-2e2o1w {display:none;}'
};

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);
	$.append_styles($$anchor, $$css);

	let expanded = $.prop($$props, 'expanded', 12, false);

	var $$exports = {
		get expanded() {
			return expanded();
		},

		set expanded($$value) {
			expanded($$value);
			$.flush();
		}
	};

	var div = root();
	var button = $.child(div);
	var div_1 = $.sibling(button, 2);
	let classes;

	$.reset(div);
	$.template_effect(() => classes = $.set_class(div_1, 1, 'svelte-2e2o1w', null, classes, { hidden: !expanded() }));
	$.event('click', button, () => expanded(!expanded()));
	$.append($$anchor, div);

	return $.pop($$exports);
}

customElements.define('custom-element', $.create_custom_element(
	_unknown_,
	{
		expanded: { attribute: 'aria-expanded', reflect: true, type: 'Boolean' }
	},
	[],
	[],
	{ mode: 'open' }
));