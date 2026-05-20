import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<span> </span>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let show = $.prop($$props, 'show', 12);
	let fields = $.prop($$props, 'fields', 12);

	var $$exports = {
		get show() {
			return show();
		},

		set show($$value) {
			show($$value);
			$.flush();
		},

		get fields() {
			return fields();
		},

		set fields($$value) {
			fields($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.each(node_1, 1, fields, $.index, ($$anchor, field) => {
				var span = root_2();
				var text = $.child(span, true);

				$.reset(span);
				$.template_effect(() => $.set_text(text, $.get(field)));
				$.append($$anchor, span);
			});

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (show()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}