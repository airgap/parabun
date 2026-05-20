import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<li> </li>`);
var root = $.from_html(`<button>Update</button> <ul></ul>`, 1);

export default function Main($$anchor) {
	let items = $.mutable_source([{ id: 1, value: "test" }], true);

	const update = () => {
		const clone = $.get(items).slice();

		clone[0].value += " !!!";
		$.set(items, clone);
	};

	var fragment = root();
	var button = $.first_child(fragment);
	var ul = $.sibling(button, 2);

	$.each(ul, 5, () => $.get(items), (item) => item.id, ($$anchor, item) => {
		var li = root_1();
		var text = $.child(li, true);

		$.reset(li);
		$.template_effect(() => $.set_text(text, ($.get(item), $.untrack(() => $.get(item).value))));
		$.append($$anchor, li);
	});

	$.reset(ul);
	$.event('click', button, update);
	$.append($$anchor, fragment);
}