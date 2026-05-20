import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button><!></button>`);

export default function Child($$anchor, $$props) {
	$.push($$props, false);

	let onclick = $.prop($$props, 'onclick', 12);

	var $$exports = {
		get onclick() {
			return onclick();
		},

		set onclick($$value) {
			onclick($$value);
			$.flush();
		}
	};

	var button = root();
	var node = $.child(button);

	$.slot(node, $$props, 'default', {}, null);
	$.reset(button);

	$.delegated('click', button, function (...$$args) {
		onclick()?.apply(this, $$args);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);