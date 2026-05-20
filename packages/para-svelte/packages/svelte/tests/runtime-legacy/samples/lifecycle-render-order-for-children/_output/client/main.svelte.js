import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { afterUpdate, beforeUpdate, onMount } from 'svelte';
import order from './order.js';
import Item from './Item.svelte';

var root = $.from_html(` <ul></ul>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let n = $.prop($$props, 'n', 12, 0);

	function logRender(n) {
		order.push(`parent: render ${n}`);

		return 'parent';
	}

	beforeUpdate(() => {
		order.push(`parent: beforeUpdate ${n()}`);
	});

	afterUpdate(() => {
		order.push(`parent: afterUpdate ${n()}`);
	});

	onMount(() => {
		order.push(`parent: onMount ${n()}`);
	});

	var $$exports = {
		get n() {
			return n();
		},

		set n($$value) {
			n($$value);
			$.flush();
		}
	};

	$.init();
	$.next();

	var fragment = root();
	var text = $.first_child(fragment);
	var ul = $.sibling(text);

	$.each(ul, 4, () => [1, 2, 3], $.index, ($$anchor, index) => {
		Item($$anchor, {
			get index() {
				return index;
			},

			get n() {
				return n();
			}
		});
	});

	$.reset(ul);

	$.template_effect(($0) => $.set_text(text, `${$0 ?? ''} `), [
		() => ($.deep_read_state(n()), $.untrack(() => logRender(n())))
	]);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}