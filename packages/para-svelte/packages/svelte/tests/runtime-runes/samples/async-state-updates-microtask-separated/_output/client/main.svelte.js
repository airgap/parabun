import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<button>click</button>`);

export default function Main($$anchor) {
	let a = $.state(0);
	let b = $.state(0);
	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			let toShow;

			var promises = $.run([
				async () => toShow = (await $.save($.async_derived(async () => (await $.save($.get(a)))())))()
			]);

			var text = $.text();

			$.template_effect(
				() => $.set_text(text, `${$.get(toShow) ?? ''}
	${$.get(b) ?? ''}`),
				void 0,
				void 0,
				[promises[0]]
			);

			$.append($$anchor, text);
		};

		var alternate = ($$anchor) => {
			var button = root_2();

			$.delegated('click', button, async () => {
				$.set(a, 1);
				await 1;
				await 1; // two microtasks needed to get timing right to reproduce the bug
				$.set(b, 1);
			});

			$.append($$anchor, button);
		};

		$.if(node, ($$render) => {
			if ($.get(a)) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);
}

$.delegate(['click']);