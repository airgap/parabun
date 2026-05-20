import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	let promise = Promise.resolve('hello');
	var value;
	var $$promises = $.run([async () => value = await $.async_derived(() => promise)]);
	var p = root();

	$.head('70s021', ($$anchor) => {
		$.deferred_template_effect(
			() => {
				$.document.title = $.get(value) ?? '';
			},
			void 0,
			void 0,
			[$$promises[0]]
		);
	});

	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $.get(value)), void 0, void 0, [$$promises[0]]);
	$.append($$anchor, p);
}