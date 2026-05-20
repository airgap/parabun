import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(` <!> <!> `, 1);

export default function Child($$anchor, $$props) {
	$.next();

	var fragment = root();
	var text = $.first_child(fragment);
	var node = $.sibling(text);

	{
		var consequent = ($$anchor) => {
			var text_1 = $.text('universe');

			$.append($$anchor, text_1);
		};

		var alternate = ($$anchor) => {
			var text_2 = $.text('world');

			$.append($$anchor, text_2);
		};

		$.if(node, ($$render) => {
			if ($$props.x === 'universe') $$render(consequent); else $$render(alternate, -1);
		});
	}

	var node_1 = $.sibling(node, 2);

	{
		var consequent_1 = ($$anchor) => {
			var text_3 = $.text('universe');

			$.append($$anchor, text_3);
		};

		var d = $.derived(() => JSON.stringify($$props.x) === '"universe"');

		var alternate_1 = ($$anchor) => {
			var text_4 = $.text('world');

			$.append($$anchor, text_4);
		};

		$.if(node_1, ($$render) => {
			if ($.get(d)) $$render(consequent_1); else $$render(alternate_1, -1);
		});
	}

	var text_5 = $.sibling(node_1);

	$.template_effect(
		($0, $1, $2) => {
			$.set_text(text, `${$$props.x ?? ''}
${$0 ?? ''} `);

			$.set_text(text_5, ` ${$1 ?? ''}
${$2 ?? ''}`);
		},
		[() => JSON.stringify($$props.x)],
		[
			() => Promise.resolve($$props.x),
			() => Promise.resolve(JSON.stringify($$props.x))
		]
	);

	$.append($$anchor, fragment);
}