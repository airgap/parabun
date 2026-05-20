import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Level2 from './Level2.svelte';
import Level3 from './Level3.svelte';

var root_3 = $.from_html(`<span>And more stuff goes in here</span>`);
var root_1 = $.from_html(`<h4> </h4> <!>`, 1);
var root = $.from_html(`<div class="level1"></div>`);

export default function Level1($$anchor, $$props) {
	$.push($$props, false);

	let values = $.prop($$props, 'values', 12);

	var $$exports = {
		get values() {
			return values();
		},

		set values($$value) {
			values($$value);
			$.flush();
		}
	};

	var div = root();

	$.each(div, 5, values, $.index, ($$anchor, value) => {
		var fragment = root_1();
		var h4 = $.first_child(fragment);
		var text = $.child(h4);

		$.reset(h4);

		var node = $.sibling(h4, 2);

		{
			let $0 = $.derived_safe_equal(() => $.get(value) % 2);

			Level2(node, {
				get condition() {
					return $.get($0);
				},

				children: ($$anchor, $$slotProps) => {
					Level3($$anchor, {
						children: ($$anchor, $$slotProps) => {
							var span = root_3();

							$.append($$anchor, span);
						},
						$$slots: { default: true }
					});
				},
				$$slots: { default: true }
			});
		}

		$.template_effect(() => $.set_text(text, `level 1 #${$.get(value) ?? ''}`));
		$.append($$anchor, fragment);
	});

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}