import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { get } from "./main.svelte";

var root_1 = $.from_html(`<p> </p>`);

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	const context = get();
	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var p = root_1();
			var text = $.child(p);

			$.reset(p);
			$.template_effect(($0) => $.set_text(text, `caught: ${$0 ?? ''} (${context ?? ''})`), void 0, [() => $$props.error]);
			$.append($$anchor, p);
		};

		var alternate = ($$anchor) => {
			var text_1 = $.text();

			$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => Promise.reject('catch me')]);
			$.append($$anchor, text_1);
		};

		$.if(node, ($$render) => {
			if ($$props.error) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}