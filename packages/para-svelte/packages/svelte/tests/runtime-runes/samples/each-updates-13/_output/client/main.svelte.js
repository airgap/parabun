import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span> </span>`);
var root = $.from_html(`<button>clear</button> <button>reverse</button> <!>`, 1);

export default function Main($$anchor) {
	function fade(node) {
		return {
			duration: 1000,
			tick(t) {
				node.style.opacity = t;
			}
		};
	}

	let items = $.state($.proxy(['a', 'b', 'c']));
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node_1 = $.sibling(button_1, 2);

	$.each(node_1, 16, () => $.get(items), (item) => item, ($$anchor, item) => {
		var span = root_1();
		var text = $.child(span, true);

		$.reset(span);
		$.template_effect(() => $.set_text(text, item));
		$.transition(3, span, () => fade, () => ({ duration: 1000 }));
		$.append($$anchor, span);
	});

	$.delegated('click', button, () => $.set(items, [], true));
	$.delegated('click', button_1, () => $.set(items, ['c', 'b', 'a'], true));
	$.append($$anchor, fragment);
}

$.delegate(['click']);