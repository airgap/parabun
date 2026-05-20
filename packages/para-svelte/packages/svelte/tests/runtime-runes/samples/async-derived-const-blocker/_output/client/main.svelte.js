import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p> </p>`);
var root_4 = $.from_html(`<p>Fetch now</p>`);
var root_5 = $.from_html(`<p>No data</p>`);

export default function Main($$anchor) {
	var d, showFetchCta;

	var $$promises = $.run([
		async () => d = await $.async_derived(() => Promise.resolve({ data: "data", hasData: true })),
		() => showFetchCta = $.derived(() => $.get(d).hasData)
	]);

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.async(node, [$$promises[1]], void 0, (node) => {
		var consequent_2 = ($$anchor) => {
			let computed_const;

			var promises = $.run([
				() => $$promises[1].promise,
				() => computed_const = $.derived(() => {
					const { data, hasData } = $.get(d);

					return { data, hasData };
				})
			]);

			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.async(node_1, [promises[1]], void 0, (node_1) => {
				var consequent = ($$anchor) => {
					var p = root_2();
					var text = $.child(p, true);

					$.reset(p);
					$.template_effect(() => $.set_text(text, $.get(computed_const).data), void 0, void 0, [promises[1]]);
					$.append($$anchor, p);
				};

				var alternate_1 = ($$anchor) => {
					var fragment_2 = $.comment();
					var node_2 = $.first_child(fragment_2);

					$.async(node_2, [$$promises[1]], void 0, (node_2) => {
						var consequent_1 = ($$anchor) => {
							var p_1 = root_4();

							$.append($$anchor, p_1);
						};

						var alternate = ($$anchor) => {
							var p_2 = root_5();

							$.append($$anchor, p_2);
						};

						$.if(
							node_2,
							($$render) => {
								if ($.get(showFetchCta)) $$render(consequent_1); else $$render(alternate, -1);
							},
							true
						);
					});

					$.append($$anchor, fragment_2);
				};

				$.if(node_1, ($$render) => {
					if ($.get(computed_const).hasData) $$render(consequent); else $$render(alternate_1, -1);
				});
			});

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if ($.get(d)) $$render(consequent_2);
		});
	});

	$.append($$anchor, fragment);
}