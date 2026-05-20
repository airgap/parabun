import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor) {
	let foo = false;
	var blocking, bar;

	var $$promises = $.run([
		async () => blocking = await $.async_derived(() => foo),
		() => bar = Promise.resolve(true)
	]);

	var fragment = root();
	var node = $.first_child(fragment);

	$.async(node, [$$promises[0]], void 0, (node) => {
		var consequent = ($$anchor) => {
			var text = $.text('foo');

			$.append($$anchor, text);
		};

		var alternate_1 = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.async(node_1, [$$promises[1]], [() => bar], (node_1, $$condition) => {
				var consequent_1 = ($$anchor) => {
					var text_1 = $.text('bar');

					$.append($$anchor, text_1);
				};

				var alternate = ($$anchor) => {
					var text_2 = $.text('else');

					$.append($$anchor, text_2);
				};

				$.if(
					node_1,
					($$render) => {
						if ($.get($$condition)) $$render(consequent_1); else $$render(alternate, -1);
					},
					true
				);
			});

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (foo) $$render(consequent); else $$render(alternate_1, -1);
		});
	});

	var node_2 = $.sibling(node, 2);

	$.async(node_2, [$$promises[0]], void 0, (node_2) => {
		var consequent_2 = ($$anchor) => {
			var text_3 = $.text('foo');

			$.append($$anchor, text_3);
		};

		var consequent_3 = ($$anchor) => {
			var text_4 = $.text('blocking');

			$.append($$anchor, text_4);
		};

		var alternate_2 = ($$anchor) => {
			var text_5 = $.text('else');

			$.append($$anchor, text_5);
		};

		$.if(node_2, ($$render) => {
			if (foo) $$render(consequent_2); else if (!$.get(blocking)) $$render(consequent_3, 1); else $$render(alternate_2, -1);
		});
	});

	$.append($$anchor, fragment);
}