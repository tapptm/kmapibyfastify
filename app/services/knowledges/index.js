"use strict";

function groupBy(arrayData, property) {
  const group_to_values = arrayData.reduce((obj, item, index) => {
    obj[item[`${property}`]] = obj[item[`${property}`]] || [];
    obj[item[`${property}`]].push(item);
    return obj;
  }, {});

  const groups = Object.keys(group_to_values).map((key) => {
    return {
      [property]: Number(key),
      data: group_to_values[key],
    };
  });

  return groups;
}

function applyArray(primaryarray, secondaryarray) {
  Array.prototype.push.apply(primaryarray, secondaryarray);
}

module.exports = async function (fastify, opts, next) {
  fastify.get("/get/mapall", async function (request, reply) {
    // Implement your business logic here...

    const connection = await fastify.mysql.getConnection();
    const [rows, fields] = await connection.query(
      `SELECT pr.concept_proposal_id,
            pr.project_id,
            prok.outcome_knowledge_name, 
            prok.outcome_knowledge_id,
            prok.outcome_knowledge_detail,
            prok.outcome_knowledge_image,
            prok.outcome_knowledge_video
      FROM progress_report_outcome AS pro 
        INNER JOIN progress_report_outcome_knowledge AS prok
      ON pro.outcome_id = prok.outcome_id
        INNER JOIN progress_report AS pr 
      ON pr.progress_report_id = pro.progress_report_id
        WHERE outcome_knowledge_name is not null`
    );

    let concept_proposal_id = [];
    let project_id = [];
    rows.map((listvalue) => {
      concept_proposal_id.push(listvalue.concept_proposal_id);
      project_id.push(listvalue.project_id);
    });
    let cciq = [...new Set(concept_proposal_id)];
    let pjid = [...new Set(project_id)];

    console.log(cciq);

    let concept_proposal_locations = [],
      knowledgedata = [],
      Innovationdata = [];

    for (let i = 0; i < cciq.length; i++) {
      try {
        const [rows] = await connection.query(
          `SELECT * FROM concept_proposal
                  INNER JOIN co_concept_fk ON concept_proposal.concept_proposal_id = co_concept_fk.concept_proposal_id
                  INNER JOIN co_researcher ON co_researcher.co_researcher_id = co_concept_fk.co_researcher_id
                  WHERE concept_proposal.concept_proposal_id = ${cciq[i]} AND co_concept_fk.area_status = 1`
        );
        // const data = helper.emptyOrRows(locations);
        rows.map((listvalue) =>
          concept_proposal_locations.push({
            concept_proposal_id: listvalue.concept_proposal_id,
            concept_proposal_name: listvalue.co_researcher,
            concept_proposal_name_th: listvalue.concept_proposal_name_th,
            project_type: listvalue.project_type_id,
            lat: listvalue.co_researcher_latitude,
            lon: listvalue.co_researcher_longitude,
          })
        );
      } catch (error) {
        console.log(error);
      }

      // console.log(rows);

      // เตรียมข้อมูลออกมาเพื่อทำโหนด

      try {
        const [rows] = await connection.query(
          `SELECT progress_report.progress_report_id,
                  progress_report.concept_proposal_id,
                  progress_report_knowledge.knowledge_id,
                  progress_report_knowledge.knowledge_name,
                  progress_report_knowledge.knowledge_image,
                  progress_report_knowledge.knowledge_detail,
                  progress_report_knowledge_group.knowledge_group_category
            FROM progress_report_knowledge
              JOIN progress_report_knowledge_group ON progress_report_knowledge_group.knowledge_group_id = progress_report_knowledge.knowledge_group_id
              JOIN progress_report ON progress_report.progress_report_id = progress_report_knowledge.progress_report_id
            WHERE progress_report.concept_proposal_id = ${cciq[i]}
            `
        );

        // knowledgedata = knowledge;

        rows.map((listvalue) => knowledgedata.push(listvalue));
      } catch (error) {
        console.log(error);
      }

      try {
        const [rows] = await connection.query(
          `SELECT  progress_report.concept_proposal_id,
                   progress_report.progress_report_id,
                   progress_report_output.output_name,
                   progress_report_output.output_id,
                   progress_report_output.output_image,
                   progress_report_output.output_detail
            FROM progress_report_output
            JOIN progress_report ON progress_report.progress_report_id = progress_report_output.progress_report_id
            
              WHERE progress_report.concept_proposal_id = ${cciq[i]}
              `
        );
        rows.map((listvalue) => Innovationdata.push(listvalue));
      } catch (error) {
        console.log(error);
      }
      // // จบตรงนี้1 อาเรย์
      // // เตรียมข้อมูลออกมาเพื่อทำโหนด

      // จบตรงนี้1 อาเรย์
    }

    // console.log(knowledgedata);

    const newlocation = groupBy(
      concept_proposal_locations,
      "concept_proposal_id"
    );

    // console.log(newlocation);
    const conceptlocation = newlocation.map((val) => val.data[0]);
    const conceptid = conceptlocation.map((val) => val.concept_proposal_id);

    const co_locations = [];
    for (let i = 0; i < conceptid.length; i++) {
      const [rows] = await connection.query(`
          SELECT 
            cp.project_type_id,
            cp.concept_proposal_name_th,
            ccf.concept_proposal_id, 
            cr.co_researcher_name_th, 
            cr.co_researcher_latitude, 
            cr.co_researcher_longitude, 
            cr.co_researcher_image
          FROM co_concept_fk ccf 
            INNER JOIN co_researcher cr 
          ON cr.co_researcher_id = ccf.co_researcher_id
            INNER JOIN concept_proposal cp
          ON cp.concept_proposal_id = ccf.concept_proposal_id
            WHERE ccf.concept_proposal_id = ${conceptid[i]}`);

      rows.map((val) =>
        co_locations.push({
          concept_proposal_id: val.concept_proposal_id,
          concept_proposal_name: val.co_researcher_name_th,
          concept_proposal_name_th: val.concept_proposal_name_th,
          lat: val.co_researcher_latitude,
          lon: val.co_researcher_longitude,
          project_type: val.project_type_id,
        })
      );
    }

    conceptlocation.map((val) => co_locations.push(val));
    // console.log(co_locations);

    const results = co_locations.map((item) => {
      const arrayResult = rows.filter(
        (itemInArray) =>
          itemInArray.concept_proposal_id === item.concept_proposal_id
      );
      return { ...item, new_knowledges: arrayResult };
    });

    const results_knowledges = results.map((item) => {
      const arrayResult = knowledgedata.filter(
        (itemInArray) =>
          itemInArray.concept_proposal_id === item.concept_proposal_id
      );
      return { ...item, knowledges: arrayResult };
    });

    const results_innovation = results_knowledges.map((item) => {
      const arrayResult = Innovationdata.filter(
        (itemInArray) =>
          itemInArray.concept_proposal_id === item.concept_proposal_id
      );
      return { ...item, Innovation: arrayResult };
    });

    const groupCencept = groupBy(results_innovation, "concept_proposal_id");
    groupCencept.map((v) => {
      if (
        v.data[0].knowledges.length >= 1 ||
        v.data[0].new_knowledges.length >= 1 ||
        v.data[0].Innovation.length >= 1
      ) {
        const o = v.data.slice(1);
        // console.log(o);
        o.map((item) => {
          item.knowledges = [];
          item.new_knowledges = [];
          item.Innovation = [];
        });
      }
    });

    const prepareNodes = [];
    groupCencept.map((listvalue, index) => {
      listvalue.data.map((item) => prepareNodes.push(item));
    });

    const parentNodes = [];
    prepareNodes.map((listvalue, index) => {
      parentNodes.push({
        id: index + 1,
        type: "parent",
        concept_proposal_id: listvalue.concept_proposal_id,
        concept_proposal_name: listvalue.concept_proposal_name,
        concept_proposal_name_th: listvalue.concept_proposal_name_th,

        lat: listvalue.lat,
        lon: listvalue.lon,
        new_knowledges: listvalue.new_knowledges,
        knowledges: listvalue.knowledges,
        Innovation: listvalue.Innovation,
        img: `https://researcher.kims-rmuti.com/icon/${
          listvalue.project_type == 1 ? "วิจัย.png" : "บริการ.png"
        }`,
      });
    });

    const childNodes = [];
    parentNodes.map((listvalue) =>
      listvalue.new_knowledges.map((item, index) =>
        childNodes.push({
          id: `${listvalue.id}.${index + 1}nkn`,
          type: "child",
          concept_proposal_id: listvalue.concept_proposal_id,
          outcome_knowledge_id: item.outcome_knowledge_id,
          outcome_knowledge_image: item.outcome_knowledge_image,
          outcome_knowledge_name: item.outcome_knowledge_name,
          outcome_knowledge_detail: item.outcome_knowledge_detail,
          concept_proposal_name_th: item.concept_proposal_name_th,
          lat: listvalue.lat,
          lon: listvalue.lon,
          img: "https://researcher.kims-rmuti.com/icon/new%20knowledge3.png",
        })
      )
    );

    const childknowledgeNodes = [];
    parentNodes.map((listvalue) =>
      listvalue.knowledges.map((item, index) =>
        childknowledgeNodes.push({
          id: `${listvalue.id}.${index + 1}`,
          type: "child",
          concept_proposal_id: listvalue.concept_proposal_id,
          knowledge_id: item.knowledge_id,
          knowledge_name: item.knowledge_name,
          knowledge_detail: item.knowledge_detail,
          knowledge_image: item.knowledge_image,
          concept_proposal_name_th: item.concept_proposal_name_th,
          lat: listvalue.lat,
          lon: listvalue.lon,
          img: "https://researcher.kims-rmuti.com/icon/knowledge3(1).png",
        })
      )
    );

    const childinnovationNodes = [];
    parentNodes.map((listvalue) =>
      listvalue.Innovation.map((item, index) =>
        childinnovationNodes.push({
          id: `${listvalue.id}.${index + 1}in`,
          type: "child",
          concept_proposal_id: listvalue.concept_proposal_id,
          output_id: item.output_id,
          output_image: item.output_image,
          output_name: item.output_detail,
          output_detail: item.output_detail,
          concept_proposal_name_th: item.concept_proposal_name_th,
          lat: listvalue.lat,
          lon: listvalue.lon,
          img: "https://researcher.kims-rmuti.com/icon/innovation2.png",
        })
      )
    );
    let knowledgelink = [];
    let Innovationlink = [];

    parentNodes.map((listvalue) => {
      listvalue.knowledges.map((kn, id) => {
        listvalue.Innovation.map((inno, idx) => {
          knowledgelink.push({
            from: `${listvalue.id}.${id + 1}`,
            to: `${listvalue.id}.${idx + 1}in`,
          });
        });
      });

      listvalue.Innovation.map((inno, idx) => {
        listvalue.new_knowledges.map((nkn, idy) => {
          Innovationlink.push({
            from: `${listvalue.id}.${idx + 1}in`,
            to: `${listvalue.id}.${idy + 1}nkn`,
          });
        });
      });
    });

    const groupNodes = groupBy(parentNodes, "concept_proposal_id");
    // console.log("sss", groupNodes);

    let linkNode = [];
    const l = groupNodes.map((item) => {
      const linknode = item.data.map((link) => {
        return { from: link.id, to: link.id + 1 };
      });

      linknode.pop();

      // console.log("sssa", linknode[0]);
      if (linknode[0]) {
        let lastone = {
          from: linknode[0].from,
          to: linknode[linknode.length - 1].to,
        };
        linknode.push(lastone);
      }

      return { links: linknode };
    });

    l.map((item) => {
      // item.links.pop();
      item.links.map((list) => linkNode.push(list));
    });

    applyArray(parentNodes, childNodes);
    applyArray(parentNodes, childknowledgeNodes);
    applyArray(parentNodes, childinnovationNodes);

    const links = childknowledgeNodes.map((listvalue) => {
      return {
        from: listvalue.id | 0,
        to: listvalue.id,
      };
    });

    applyArray(links, linkNode);
    applyArray(links, knowledgelink);
    applyArray(links, Innovationlink);

    return reply.code(200).send({ nodes: parentNodes, links: links });
  });

  next();
};
