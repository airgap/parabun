import 'svelte/internal/disclose-version';
import { signal } from "@para/signals";
import * as $ from 'svelte/internal/client';

export const externalCount = signal(0);

var root = $.from_html(`<p> </p>`);

export default function Counter($$anchor, $$props) {
	$.push($$props, true);

	const __sig_count = externalCount;
	let count = $.state($.proxy(__sig_count.peek()));

	$.user_pre_effect(() => {
		$.set(count, __sig_count.get(), true);
	});

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $.get(count)));
	$.append($$anchor, p);
	$.pop();
}