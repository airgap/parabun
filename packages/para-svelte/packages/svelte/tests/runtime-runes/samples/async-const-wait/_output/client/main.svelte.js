import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_4 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.boundary(node, {}, ($$anchor) => {
		let a;

		var promises = $.run([
			async () => a = (await $.save($.async_derived(async () => (await $.save($$props.a_promise))())))()
		]);

		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		{
			var consequent_1 = ($$anchor) => {
				var fragment_2 = $.comment();
				var node_2 = $.first_child(fragment_2);

				$.boundary(node_2, {}, ($$anchor) => {
					let b;

					var promises_1 = $.run([
						async () => b = (await $.save($.async_derived(async () => (await $.save($$props.b_promise))())))()
					]);

					var fragment_3 = $.comment();
					var node_3 = $.first_child(fragment_3);

					{
						var consequent = ($$anchor) => {
							let sum;

							var promises_2 = $.run([
								() => $.wait([promises[0], promises_1[0]]),
								() => sum = $.derived(() => $.get(a) + $.get(b))
							]);

							var p = root_4();
							var text = $.child(p, true);

							$.reset(p);
							$.template_effect(() => $.set_text(text, $.get(sum)), void 0, void 0, [promises_2[1]]);
							$.append($$anchor, p);
						};

						$.if(node_3, ($$render) => {
							if (true) $$render(consequent);
						});
					}

					$.append($$anchor, fragment_3);
				});

				$.append($$anchor, fragment_2);
			};

			$.if(node_1, ($$render) => {
				if (true) $$render(consequent_1);
			});
		}

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);
}