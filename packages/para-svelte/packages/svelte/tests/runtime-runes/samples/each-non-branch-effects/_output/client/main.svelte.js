import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span> </span>`);
var root = $.from_html(`<!> <button class="add">add</button> <button class="remove">remove</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let items = $.proxy([]);

	const proxy = new Proxy(items, {
		get: (target, prop) => {
			try {
				$.user_pre_effect(() => {
					return () => {};
				});
			} catch {}

			return Reflect.get(target, prop);
		}
	});

	function add() {
		items.push(items.length + 1);
	}

	function remove() {
		items.pop();
	}

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 17, () => proxy, $.index, ($$anchor, item) => {
		var span = root_1();
		var text = $.child(span, true);

		$.reset(span);
		$.template_effect(() => $.set_text(text, $.get(item)));
		$.append($$anchor, span);
	});

	var button = $.sibling(node, 2);
	var button_1 = $.sibling(button, 2);

	$.delegated('click', button, add);
	$.delegated('click', button_1, remove);
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);