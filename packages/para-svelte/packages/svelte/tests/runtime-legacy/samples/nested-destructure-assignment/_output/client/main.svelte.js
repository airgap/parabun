import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { get, writable } from 'svelte/store';

var root = $.from_html(`<p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <h1>Bag'ol stores</h1> <p> </p> <p> </p> <p> </p> <button>Click me!</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $bagOlStores = () => $.store_get(bagOlStores, '$bagOlStores', $$stores);
	const $secondStore = () => $.store_get(secondStore, '$secondStore', $$stores);
	const $firstStore = () => $.store_get(firstStore, '$firstStore', $$stores);
	const $thirdStore = () => $.store_get($.get(thirdStore), '$thirdStore', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();

	let bagOlStores = writable({
		firstNonStore: 1,
		secondNonStore: 2,
		thirdNonStore: 3,
		firstStore: writable(4),
		secondStore: writable(5),
		thirdStore: writable(6)
	});

	let tmp = $bagOlStores(),
		firstNonStore = $.mutable_source(tmp.firstNonStore),
		secondNonStore = $.mutable_source(tmp.secondNonStore),
		thirdNonStore = $.mutable_source(tmp.thirdNonStore),
		firstStore = tmp.firstStore,
		secondStore = tmp.secondStore,
		thirdStore = $.mutable_source(tmp.thirdStore);

	function changeStores() {
		$.store_set(bagOlStores, (($$value) => {
			$.store_unsub($.set(thirdStore, $$value.thirdStore), '$thirdStore', $$stores);
			$.store_set(secondStore, $$value.$secondStore);
			$.store_set(firstStore, $$value.$firstStore);
			$.set(firstNonStore, $$value.firstNonStore);
			$.set(secondNonStore, $$value.secondNonStore);
			$.set(thirdNonStore, $$value.thirdNonStore);

			return $$value;
		})({
			firstNonStore: 7,
			secondNonStore: 8,
			thirdNonStore: 9,
			$firstStore: 10,
			$secondStore: 11,
			firstStore: writable(14),
			secondStore: writable(13),
			thirdStore: writable(12)
		}));
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
				$.untrack(() => get($bagOlStores().firstStore))
			),

			() => (
				$.deep_read_state(get),
				$bagOlStores(),
				$.untrack(() => get($bagOlStores().secondStore))
			),

			() => (
				$.deep_read_state(get),
				$bagOlStores(),
				$.untrack(() => get($bagOlStores().thirdStore))
			)
		]
	);

	$.event('click', button, changeStores);
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}