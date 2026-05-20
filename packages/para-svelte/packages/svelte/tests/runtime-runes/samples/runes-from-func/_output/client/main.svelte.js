import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span> </span>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	function foo() {
		let x = $.state(0);

		queueMicrotask(() => {
			$.update(x);
		});

		return {
			wut() {
				return $.get(x);
			}
		};
	}

	const wut = foo().wut;
	const x = $.derived(wut);
	var span = root();
	var text = $.child(span, true);

	$.reset(span);
	$.template_effect(() => $.set_text(text, $.get(x)));
	$.append($$anchor, span);
	$.pop();
}