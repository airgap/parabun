import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from "./Component.svelte";

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let arr = $.prop($$props, 'arr', 28, () => []);
	let count = $.prop($$props, 'count', 12, 0);

	function action(node, params) {
		count(count() + 1);

		return {
			destroy() {
				count(count() - 1);
			}
		};
	}

	var $$exports = {
		get arr() {
			return arr();
		},

		set arr($$value) {
			arr($$value);
			$.flush();
		},

		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	$.each(node_1, 1, arr, (item) => item, ($$anchor, item) => {
		Component($$anchor, { action });
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}