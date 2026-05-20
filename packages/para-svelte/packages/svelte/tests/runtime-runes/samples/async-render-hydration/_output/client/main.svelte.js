import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

const ssr = ($$anchor, num = $.noop) => {
	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, num()));
	$.append($$anchor, text);
};

var root = $.from_html(` <!>`, 1);

export default function Main($$anchor) {
	let count = 1;

	async function getDouble(count) {
		return count * 2;
	}

	var double;

	var $$promises = $.run([
		async () => double = await $.async_derived(() => getDouble(count))
	]);

	$.next();

	var fragment_1 = root();
	var text_1 = $.first_child(fragment_1);
	var node = $.sibling(text_1);

	$.async(node, [$$promises[0]], void 0, (node) => {
		ssr(node, () => $.get(double));
	});

	$.template_effect(() => $.set_text(text_1, 'Count: 1 Double: '), void 0, void 0, [$$promises[0]]);
	$.append($$anchor, fragment_1);
}