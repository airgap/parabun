import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { get, writable } from 'svelte/store';

var root = $.from_html(`<p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <h1>Bag'ol stores</h1> <p> </p> <p> </p> <p> </p> <button>Click me!</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $bagOlStores = () => $.store_get(bagOlStores, '$bagOlStores', $$stores);
	const $secondStore = () => $.store_get($.get(secondStore), '$secondStore', $$stores);
	const $firstStore = () => $.store_get($.get(firstStore), '$firstStore', $$stores);
	const $thirdStore = () => $.store_get($.get(thirdStore), '$thirdStore', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let bagOlStores = writable([1, 2, 3, writable(4), writable(5), writable(6)]);
	let firstNonStore = $.mutable_source();
	let secondNonStore = $.mutable_source();
	let thirdNonStore = $.mutable_source();
	let firstStore = $.mutable_source();
	let secondStore = $.mutable_source();
	let thirdStore = $.mutable_source();

	(($$value) => {
		var $$array = $.to_array($$value, 6);

		$.set(firstNonStore, $$array[0]);
		$.set(secondNonStore, $$array[1]);
		$.set(thirdNonStore, $$array[2]);
		$.store_unsub($.set(firstStore, $$array[3]), '$firstStore', $$stores);
		$.store_unsub($.set(secondStore, $$array[4]), '$secondStore', $$stores);
		$.store_unsub($.set(thirdStore, $$array[5]), '$thirdStore', $$stores);
	})($bagOlStores());

	function changeStores() {
		$.store_set(bagOlStores, (($$value) => {
			var $$array_1 = $.to_array($$value, 6);

			$.set(firstNonStore, $$array_1[0]);
			$.set(secondNonStore, $$array_1[1]);
			$.set(thirdNonStore, $$array_1[2]);
			$.store_unsub($.set(firstStore, $$array_1[3]), '$firstStore', $$stores);
			$.store_set($.get(secondStore), $$array_1[4]);
			$.store_unsub($.set(thirdStore, $$array_1[5]), '$thirdStore', $$stores);

			return $$value;
		})([
			7,
			8,
			9,
			writable(10),
			11,
			writable(12),
			writable(14),
			writable(15)
		]));
	}

	$.init();

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1, true);

	$.reset(p_1);

	var p_2 = $.sibling(p_1, 2);
	var text_2 = $.child(p_2, true);

	$.reset(p_2);

	var p_3 = $.sibling(p_2, 2);
	var text_3 = $.child(p_3, true);

	$.reset(p_3);

	var p_4 = $.sibling(p_3, 2);
	var text_4 = $.child(p_4, true);

	$.reset(p_4);

	var p_5 = $.sibling(p_4, 2);
	var text_5 = $.child(p_5, true);

	$.reset(p_5);

	var p_6 = $.sibling(p_5, 4);
	var text_6 = $.child(p_6, true);

	$.reset(p_6);

	var p_7 = $.sibling(p_6, 2);
	var text_7 = $.child(p_7, true);

	$.reset(p_7);

	var p_8 = $.sibling(p_7, 2);
	var text_8 = $.child(p_8, true);

	$.reset(p_8);

	var button = $.sibling(p_8, 2);

	$.template_effect(
		($0, $1, $2) => {
			$.set_text(text, $.get(firstNonStore));
			$.set_text(text_1, $.get(secondNonStore));
			$.set_text(text_2, $.get(thirdNonStore));
			$.set_text(text_3, $firstStore());
			$.set_text(text_4, $secondStore());
			$.set_text(text_5, $thirdStore());
			$.set_text(text_6, $0);
			$.set_text(text_7, $1);
			$.set_text(text_8, $2);
		},
		[
			() => (
				$.deep_read_state(get),
				$bagOlStores(),
				$.untrack(() => get($bagOlStores()[5]))
			),

			() => (
				$.deep_read_state(get),
				$bagOlStores(),
				$.untrack(() => get($bagOlStores()[6]))
			),

			() => (
				$.deep_read_state(get),
				$bagOlStores(),
				$.untrack(() => get($bagOlStores()[7]))
			)
		]
	);

	$.event('click', button, changeStores);
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}