import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p id="if-branch">if branch</p>`);
var root_2 = $.from_html(`<p id="else-branch"> </p>`);

export default function Main($$anchor) {
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.async(node, [], [() => false], (node, $$condition) => {
		var consequent = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		var alternate = ($$anchor) => {
			var p_1 = root_2();
			var text = $.child(p_1, true);

			$.reset(p_1);
			$.template_effect(($0) => $.set_text(text, $0), void 0, [() => 'else branch']);
			$.append($$anchor, p_1);
		};

		$.if(node, ($$render) => {
			if ($.get($$condition)) $$render(consequent); else $$render(alternate, -1);
		});
	});

	$.append($$anchor, fragment);
}