/**
 * @file Form Pid Page
 * 
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 * 
 * @version 1.0
 *
 */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Editor from "../../../editor/Editor";

type Props = {};

const Form = (props: Props) => {
  /**
   * get the page id
   */
  const { pid } = useParams<"pid">();

  return <Editor id={pid ?? "idUndefined"} />;
};

export default Form;
