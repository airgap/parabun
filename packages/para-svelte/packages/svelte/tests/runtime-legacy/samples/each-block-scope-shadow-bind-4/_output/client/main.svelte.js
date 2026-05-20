import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> <input/></div>`);
var root = $.from_html(`<!> <button>Button</button>`, 1);

export default function Main($$anchor) {
	let a = $.mutable_source([{ a: { b: 'Hello', c: 'World' }, key: 'b' }]);
	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(a), $.index, ($$anchor, $$item, $$index, $$array) => {
		let a = () => $.get($$item).a;
		let key = () => $.get($$item).key;
		var div = root_1();
		var text = $.child(div);
		var input = $.sibling(text);

		$.remove_input_defaults(input);
		$.reset(div);
		$.template_effect(() => $.set_text(text, `${key() ?? ''}: ${(a(), key(), $.untrack(() => a()[key()])) ?? ''} `));

		$.bind_value(input, () => a()[key()], ($$value) => (
			a()[key()] = $$value,
			$.invalidate_inner_signals(() => ($$array()))
		));

		$.append($$anchor, div);
	});

	var button = $.sibling(node, 2);

	$.event('click', button, () => $.mutate(a, $.get(a)[0].key = 'c'));
	$.append($$anchor, fragment);
}