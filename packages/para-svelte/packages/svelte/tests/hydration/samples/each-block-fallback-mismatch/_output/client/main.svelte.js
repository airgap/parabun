import 'svelte/internal/disclose-version';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<p>empty</p>`);
var root_3 = $.from_html(`<p> </p>`);
var root_4 = $.from_html(`<p>empty</p>`);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	var fragment = root();
	var node = $.first_child(fragment);

	$.each(
		node,
		17,
		() => $$props.items1,
		$.index,
		($$anchor, item) => {
			var p = root_1();
			var text = $.child(p, true);

			$.reset(p);
			$.template_effect(() => $.set_text(text, $.get(item).name));
			$.append($$anchor, p);
		},
		($$anchor) => {
			var p_1 = root_2();

			$.append($$anchor, p_1);
		}
	);

	var node_1 = $.sibling(node, 2);

	$.each(
		node_1,
		17,
		() => $$props.items2,
		$.index,
		($$anchor, item) => {
			var p_2 = root_3();
			var text_1 = $.child(p_2, true);

			$.reset(p_2);
			$.template_effect(() => $.set_text(text_1, $.get(item).name));
			$.append($$anchor, p_2);
		},
		($$anchor) => {
			var p_3 = root_4();

			$.append($$anchor, p_3);
		}
	);

	$.append($$anchor, fragment);
}