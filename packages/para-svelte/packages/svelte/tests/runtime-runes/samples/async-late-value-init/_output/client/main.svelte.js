import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	function use() {
		return () => 1;
	}

	var name, aa;

	var $$promises = $.run([
		async () => name = await $.async_derived(() => new Promise((a) => a('aaa'))),
		() => aa = use()
	]);

	$.next();

	var text = $.text();

	$.template_effect(
		($0) => $.set_text(text, `${$.get(name) ?? ''}
${$0 ?? ''}`),
		[() => aa()],
		void 0,
		[$$promises[0], $$promises[1]]
	);

	$.append($$anchor, text);
	$.pop();
}