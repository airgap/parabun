import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import C from './C.svelte';

var root_1 = $.from_html(`<p><!></p>`);

export default function B($$anchor, $$props) {
	$.push($$props, false);

	let list = $.prop($$props, 'list', 28, () => [1, 2, 3, 2, 1]);
	let currentIdentifier = $.prop($$props, 'currentIdentifier', 12);

	var $$exports = {
		get list() {
			return list();
		},

		set list($$value) {
			list($$value);
			$.flush();
		},

		get currentIdentifier() {
			return currentIdentifier();
		},

		set currentIdentifier($$value) {
			currentIdentifier($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, list, $.index, ($$anchor, item) => {
		var p = root_1();
		var node_1 = $.child(p);

		C(node_1, {
			get identifier() {
				return $.get(item);
			},

			get currentIdentifier() {
				return currentIdentifier();
			},

			set currentIdentifier($$value) {
				currentIdentifier($$value);
			},

			children: ($$anchor, $$slotProps) => {
				$.next();

				var text = $.text();

				$.template_effect(() => $.set_text(text, $.get(item)));
				$.append($$anchor, text);
			},
			$$slots: { default: true },
			$$legacy: true
		});

		$.reset(p);
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}