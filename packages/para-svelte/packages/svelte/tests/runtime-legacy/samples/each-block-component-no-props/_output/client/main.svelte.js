import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let items = $.mutable_source([1]);

	function add() {
		$.set(items, [1]);
	}

	function remove() {
		$.set(items, []);
	}

	var $$exports = { add, remove };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(items), $.index, ($$anchor, item) => {
		Child($$anchor, {});
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'add', add);
	$.bind_prop($$props, 'remove', remove);

	return $.pop($$exports);
}