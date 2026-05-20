import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let columns = $.prop($$props, 'columns', 12);
	let rows = $.prop($$props, 'rows', 12);

	var $$exports = {
		get columns() {
			return columns();
		},

		set columns($$value) {
			columns($$value);
			$.flush();
		},

		get rows() {
			return rows();
		},

		set rows($$value) {
			rows($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, columns, $.index, ($$anchor, x) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		$.each(node_1, 1, rows, $.index, ($$anchor, y) => {
			var div = root_2();
			var text = $.child(div);

			$.reset(div);
			$.template_effect(() => $.set_text(text, `${$.get(x) ?? ''}, ${$.get(y) ?? ''}`));
			$.append($$anchor, div);
		});

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}