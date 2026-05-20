import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(` <br/> <!>`, 1), Main[$.FILENAME], [[6, 9]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	const tags = [{ t: 'div', content: 'hello world' }, { t: 'input' }];
	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.add_svelte_meta(
		() => $.each(node, 1, () => tags, $.index, ($$anchor, tag) => {
			$.next();

			var fragment_1 = root_1();
			var text = $.first_child(fragment_1);
			var node_1 = $.sibling(text, 3);

			{
				$.validate_dynamic_element_tag(() => $.get(tag).t);
				$.validate_void_dynamic_element(() => $.get(tag).t);

				$.element(
					node_1,
					() => $.get(tag).t,
					false,
					($$element, $$anchor) => {
						var fragment_2 = $.comment();
						var node_2 = $.first_child(fragment_2);

						{
							var consequent = ($$anchor) => {
								var text_1 = $.text();

								$.template_effect(() => $.set_text(text_1, ($.get(tag), $.untrack(() => $.get(tag).content))));
								$.append($$anchor, text_1);
							};

							$.add_svelte_meta(
								() => $.if(node_2, ($$render) => {
									if ((
										$.get(tag),
										$.untrack(() => $.strict_equals($.get(tag).t, 'input', false))
									)) $$render(consequent);
								}),
								'if',
								Main,
								8,
								2
							);
						}

						$.append($$anchor, fragment_2);
					},
					void 0,
					[7, 1]
				);
			}

			$.template_effect(() => $.set_text(text, `${($.get(tag), $.untrack(() => $.get(tag).t)) ?? ''} `));
			$.append($$anchor, fragment_1);
		}),
		'each',
		Main,
		5,
		0
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}