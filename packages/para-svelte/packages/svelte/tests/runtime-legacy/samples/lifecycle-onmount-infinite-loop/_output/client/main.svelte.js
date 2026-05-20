import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount, mount } from 'svelte';
import Child from './Child.svelte';

var root_1 = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let root = $.mutable_source();
	let count = $.prop($$props, 'count', 12, 0);

	onMount(() => {
		if (count() < 5) {
			$.update_prop(count);
			mount(Child, { target: $.get(root) });
		}
	});

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	$.init();

	var div = root_1();

	$.bind_this(div, ($$value) => $.set(root, $$value), () => $.get(root));
	$.append($$anchor, div);

	return $.pop($$exports);
}