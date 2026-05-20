import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root_1 = $.from_html(`<p>pending</p>`);
var root_4 = $.from_html(`<span> </span>`);
var root_3 = $.from_html(`<li><!></li>`);
var root_2 = $.from_html(`<ul></ul>`);
var root = $.from_html(`<!> <button>add</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const $items = () => $.store_get(items, '$items', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const items = writable([{ id: 1 }]);

	function add_item() {
		items.update((arr) => [...arr, { id: arr.length + 1 }]);
	}

	function query(item) {
		return Promise.resolve([item.id * 10, item.id * 20]);
	}

	var fragment = root();
	var node = $.first_child(fragment);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var ul = root_2();

			$.each(ul, 5, $items, (item) => item.id, ($$anchor, item) => {
				var li = root_3();
				var node_1 = $.child(li);

				$.async(node_1, [], [() => query($.get(item))], (node_1, $$collection) => {
					$.each(node_1, 17, () => $.get($$collection), $.index, ($$anchor, value) => {
						var span = root_4();
						var text = $.child(span, true);

						$.reset(span);
						$.template_effect(() => $.set_text(text, $.get(value)));
						$.append($$anchor, span);
					});
				});

				$.reset(li);
				$.template_effect(() => $.set_attribute(li, 'data-item', $.get(item).id));
				$.append($$anchor, li);
			});

			$.reset(ul);
			$.append($$anchor, ul);
		});
	}

	var button = $.sibling(node, 2);

	$.delegated('click', button, add_item);
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}

$.delegate(['click']);