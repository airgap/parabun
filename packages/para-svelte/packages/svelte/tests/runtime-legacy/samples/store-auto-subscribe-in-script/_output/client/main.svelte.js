import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>+1</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $count = () => $.store_get(count(), '$count', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let count = $.prop($$props, 'count', 12);

	function get_count() {
		return $count();
	}

	var $$exports = {
		get_count,
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	$.init();

	var button = root();

	$.event('click', button, () => count().update((n) => n + 1));
	$.append($$anchor, button);
	$.bind_prop($$props, 'get_count', get_count);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}